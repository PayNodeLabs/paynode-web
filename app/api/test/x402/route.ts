import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig, PROTOCOL_TREASURY, MIN_PAYMENT_AMOUNT } from '../../pom/config';
import { supabaseAdmin } from '../../pom/lib/supabase-admin';
import type { UnifiedPaymentPayload, ExactEVMPayload } from '@paynodelabs/sdk-js';



export async function POST(req: NextRequest) {
  try {
    const { agent_name } = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';
    const config = getNetworkConfig(isMainnet);
    const networkId = `eip155:${config.chainId}`;

    const v2PayloadHeader = req.headers.get('PAYMENT-SIGNATURE') || req.headers.get('X-402-Payload');
    const orderId = req.headers.get('X-402-Order-Id');

    if (v2PayloadHeader) {
      const { getPayNodeVerifier, parseUnifiedPayload } = await import('../../pom/lib/verify-payment');

      let unifiedPayload: UnifiedPaymentPayload;
      try {
        unifiedPayload = parseUnifiedPayload(v2PayloadHeader, orderId);
      } catch {
        return NextResponse.json({ error: "invalid_payload", message: "Failed to decode payment signature header." }, { status: 400 });
      }

      const verifier = await getPayNodeVerifier({
        rpcUrls: config.rpcUrls,
        chainId: config.chainId,
        routerAddress: config.routerAddress,
        usdcAddress: config.usdcAddress,
        isMainnet: isMainnet,
        orderId: orderId,
        isEip3009: unifiedPayload.type === 'eip3009'
      });

      if (!orderId) {
        return NextResponse.json({ error: "order_mismatch", message: "Missing 'X-402-Order-Id' in retry header." }, { status: 400 });
      }

      const verification = await verifier.verify(unifiedPayload, {
        merchantAddress: PROTOCOL_TREASURY,
        tokenAddress: config.usdcAddress,
        amount: MIN_PAYMENT_AMOUNT.toString(), // Protocol minimum
        orderId: orderId
      }, unifiedPayload.type === 'eip3009' ? { name: "USD Coin", version: "2" } : {});

      if (!verification.isValid) {
        return NextResponse.json({
          success: false,
          errorReason: verification.error?.message || "invalid_payload"
        }, { status: 403 });
      }

      // Background Settlement Logic (Auto-Settle)
      const DEMO_PRIVATE_KEY = process.env.DEMO_FAUCET_KEY;
      if (unifiedPayload.type === 'eip3009' && DEMO_PRIVATE_KEY) {
        const { performSettleAndUpdate } = await import('../../pom/lib/settle-and-update');
        const payload = unifiedPayload.payload as ExactEVMPayload;
        performSettleAndUpdate(payload, {
          rpcUrl: config.rpcUrls[0],
          tokenAddress: config.usdcAddress,
          privateKey: DEMO_PRIVATE_KEY,
          orderId: orderId,
          agentName: agent_name || 'X402_V2_TESTER'
        }).catch(() => {});
      }


      const payload = unifiedPayload.payload;
      const txHash = ('txHash' in payload && payload.txHash)
        ? payload.txHash
        : `auth:${Buffer.from(JSON.stringify(unifiedPayload)).toString('base64')}`;

      const responseHash = ('txHash' in payload && payload.txHash)
        ? payload.txHash
        : `eip3009:${(payload as ExactEVMPayload).signature.slice(0, 24)}...`;

      await supabaseAdmin.from('transactions').upsert({
        agent_name: agent_name || 'X402_V2_TESTER',
        tx_hash: txHash,
        amount: Number(MIN_PAYMENT_AMOUNT) / 1000000,
        merchant_address: PROTOCOL_TREASURY,
        network: isMainnet ? 'mainnet' : 'testnet',
        order_id: orderId || `test_${Date.now()}`
      }, { onConflict: 'tx_hash' });

      const successResponse = NextResponse.json({
        success: true,
        transaction: responseHash,
        agent_name: agent_name || 'X402_V2_TESTER',
        network: networkId
      });

      // Add Settlement Confirmation Headers (V2 Standard)
      const payer = ('authorization' in unifiedPayload.payload) ? (unifiedPayload.payload as ExactEVMPayload).authorization.from : undefined;
      const settlementInfo = JSON.stringify({
        success: true,
        transaction: txHash,
        network: networkId,
        payer: payer
      });
      const b64Settlement = Buffer.from(settlementInfo).toString('base64');
      successResponse.headers.set('PAYMENT-RESPONSE', b64Settlement);
      successResponse.headers.set('X-PAYMENT-RESPONSE', b64Settlement);

      return successResponse;
    }

    const newOrderId = `pn_web_${Date.now()}`;

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
          type: "onchain",
          network: networkId,
          amount: MIN_PAYMENT_AMOUNT.toString(),
          asset: config.usdcAddress,
          payTo: PROTOCOL_TREASURY,
          maxTimeoutSeconds: 600,
          router: config.routerAddress,
          extra: { name: "USD Coin", version: "2" }
        },
        {
          scheme: "exact",
          type: "eip3009",
          network: networkId,
          amount: MIN_PAYMENT_AMOUNT.toString(),
          asset: config.usdcAddress,
          payTo: PROTOCOL_TREASURY,
          maxTimeoutSeconds: 600,
          extra: {
            name: "USD Coin",
            version: "2"
          }
        }
      ]
    };

    const b64Required = Buffer.from(JSON.stringify(v2Response)).toString('base64');
    const response = NextResponse.json(v2Response, { status: 402 });
    response.headers.set('PAYMENT-REQUIRED', b64Required);
    response.headers.set('X-402-Required', b64Required);
    response.headers.set('X-402-Order-Id', newOrderId);
    response.headers.set('X-PayNode-Order-Id', newOrderId);
    return response;


  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
