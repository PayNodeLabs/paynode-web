import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig, PROTOCOL_TREASURY } from '../../pom/config';
import { supabaseAdmin } from '../../pom/lib/supabase-admin';
import { PayNodeVerifier } from '@paynodelabs/sdk-js';
import type { UnifiedPaymentPayload, ExactEVMPayload } from '@paynodelabs/sdk-js';

interface EIP3009Payload extends ExactEVMPayload {
  extra?: Record<string, string>;
}

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
          async checkAndSet(key: string, _ttlSeconds: number) {
            // 🛡️ Proactive locking (matching main POM)
            const { data: existing } = await supabaseAdmin.from('transactions').select('id').eq('tx_hash', key).maybeSingle();
            if (existing) return false;

            const { error } = await supabaseAdmin.from('transactions').insert({
              tx_hash: key,
              amount: 0,
              agent_name: '_pending',
              network: isMainnet ? 'mainnet' : 'testnet',
              order_id: orderId || 'test_pending'
            });
            return !error;
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

      const payload = unifiedPayload.payload as any;
      const txHash = typeof payload.txHash === 'string'
        ? payload.txHash
        : `eip3009:${payload.signature.slice(0, 66)}`;

      const responseHash = typeof payload.txHash === 'string'
        ? payload.txHash
        : `eip3009:${payload.signature.slice(0, 24)}...`;

      await supabaseAdmin.from('transactions').insert({
        agent_name: agent_name || 'X402_V2_TESTER',
        tx_hash: txHash,
        amount: 0.01,
        merchant_address: PROTOCOL_TREASURY,
        network: isMainnet ? 'mainnet' : 'testnet',
        order_id: orderId || `test_${Date.now()}`
      });

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
