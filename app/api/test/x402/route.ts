import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig, PROTOCOL_TREASURY } from '../../pom/config';
import { supabaseAdmin } from '../../pom/lib/supabase-admin';
import { PayNodeVerifier } from '@paynodelabs/sdk-js';
import type { UnifiedPaymentPayload, ExactEVMPayload } from '@paynodelabs/sdk-js';



export async function POST(req: NextRequest) {
  try {
    const { agent_name } = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';
    const config = getNetworkConfig(isMainnet);
    const networkId = `eip155:${config.chainId}`;

    const v2PayloadHeader = req.headers.get('X-402-Payload');
    const orderId = req.headers.get('X-402-Order-Id');

    if (v2PayloadHeader) {
      const verifier = new PayNodeVerifier({
        rpcUrls: config.rpcUrls,
        chainId: config.chainId,
        contractAddress: config.routerAddress,
        store: {
          async checkAndSet(key: string) {
            // 🛡️ Proactive locking (matching main POM)
            const { data: existing, error: selectError } = await supabaseAdmin.from('transactions').select('agent_name, order_id').eq('tx_hash', key).maybeSingle();
            
            if (selectError) {
              console.error("[Test_Idempotency_Select_Error]:", selectError.message);
            }

            if (existing && existing.agent_name !== '_pending') {
              console.warn(`[Test_Idempotency_Rejected]: Key ${key} already consumed by ${existing.agent_name} for order ${existing.order_id}`);
              return false; // Already consumed by a real agent
            }

            const { error: upsertError } = await supabaseAdmin.from('transactions').upsert({
              tx_hash: key,
              agent_name: '_pending',
              amount: 0,
              merchant_address: PROTOCOL_TREASURY, // 🛡️ Fix Not-Null constraint
              network: isMainnet ? 'mainnet' : 'testnet',
              order_id: orderId || `test_pending_${Date.now()}_${Math.floor(Math.random() * 1000)}`
            }, { onConflict: 'tx_hash' });

            if (upsertError) {
              console.error("[Test_Idempotency_Upsert_Fatal]:", upsertError.message, "Key:", key, "OrderId:", orderId);
              return false;
            }

            return true;
          },
          async delete(key: string) {
            await supabaseAdmin.from('transactions').delete().eq('tx_hash', key).eq('agent_name', '_pending');
          }
        },
        acceptedTokens: [config.usdcAddress]
      });

      let unifiedPayload: UnifiedPaymentPayload;
      try {
        unifiedPayload = JSON.parse(Buffer.from(v2PayloadHeader, 'base64').toString());
      } catch {
        return NextResponse.json({ error: "INVALID_PAYLOAD: Failed to decode X-402-Payload header." }, { status: 400 });
      }

      if (!orderId) {
        return NextResponse.json({ error: "ORDER_MISMATCH: Missing 'X-402-Order-Id' in retry header." }, { status: 400 });
      }

      const verification = await verifier.verify(unifiedPayload, {
        merchantAddress: PROTOCOL_TREASURY,
        tokenAddress: config.usdcAddress,
        amount: "10000",
        orderId: orderId
      }, unifiedPayload.type === 'eip3009' ? { name: "USD Coin", version: "2" } : {});

      if (!verification.isValid) {
        return NextResponse.json({
          success: false,
          errorReason: verification.error?.message || "invalid_payload"
        }, { status: 403 });
      }

      // 🛡️ Cleanup placeholder for EIP-3009 (since we use signature-based tx_hash for the final record)
      if (unifiedPayload.type === 'eip3009') {
        const nonce = (unifiedPayload.payload as ExactEVMPayload).authorization.nonce;
        await supabaseAdmin.from('transactions').delete().eq('tx_hash', nonce).eq('agent_name', '_pending');
      }

      const payload = unifiedPayload.payload;
      const txHash = ('txHash' in payload && payload.txHash)
        ? payload.txHash
        : `eip3009:${(payload as ExactEVMPayload).signature.slice(0, 66)}`;

      const responseHash = ('txHash' in payload && payload.txHash)
        ? payload.txHash
        : `eip3009:${(payload as ExactEVMPayload).signature.slice(0, 24)}...`;

      await supabaseAdmin.from('transactions').upsert({
        agent_name: agent_name || 'X402_V2_TESTER',
        tx_hash: txHash,
        amount: 0.01,
        merchant_address: PROTOCOL_TREASURY,
        network: isMainnet ? 'mainnet' : 'testnet',
        order_id: orderId || `test_${Date.now()}`
      }, { onConflict: 'tx_hash' });

      return NextResponse.json({
        success: true,
        transaction: responseHash,
        agent_name: agent_name || 'X402_V2_TESTER',
        network: networkId
      });
    }

    const v2Response = {
      x402Version: 2,
      error: "X-402-Payload header is required",
      resource: {
        url: req.url,
        description: "Production-ready X402 Compatibility Test",
        mimeType: "application/json"
      },
      accepts: [
        {
          scheme: "exact",
          type: "eip3009",
          network: networkId,
          amount: "10000",
          asset: config.usdcAddress,
          payTo: PROTOCOL_TREASURY,
          maxTimeoutSeconds: 600,
          extra: {
            name: "USD Coin",
            version: "2"
          }
        },
        {
          scheme: "exact",
          type: "onchain",
          network: networkId,
          amount: "10000",
          asset: config.usdcAddress,
          payTo: PROTOCOL_TREASURY,
          maxTimeoutSeconds: 600,
          router: config.routerAddress
        }
      ]
    };

    const b64Required = Buffer.from(JSON.stringify(v2Response)).toString('base64');
    const response = NextResponse.json(v2Response, { status: 402 });
    response.headers.set('X-402-Required', b64Required);
    return response;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
