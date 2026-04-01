import { NextResponse } from 'next/server';
import { PayNodeMerchant } from '@paynodelabs/sdk-js';
import { supabaseAdmin } from '@/app/api/pom/lib/supabase-admin';
import { PROTOCOL_TREASURY, MIN_PAYMENT_AMOUNT } from '@/app/api/pom/config';

// Initialize Merchant SDK (Pure Market Mode - No wallet needed in config)
const merchant = new PayNodeMerchant({
  sharedSecret: process.env.PLATFORM_HMAC_SECRET || 'dev_secret_override_in_prod'
});

export async function POST(request: Request) {
  try {
    // 🛡️ SDK-JS: Verify Signature & Unwrap Body & Extract Payment Context
    const { isValid, error, body, paynodeContext } = await merchant.verify(request);

    if (!isValid) {
      console.warn(`[Merchant-Auth-Failure] ${error}. Denying access.`);
      return NextResponse.json({ error: 'unauthorized', message: error }, { status: 401 });
    }

    // ⚡️ SINGLE-INTERFACE DISCOVERY: Handle Discovery Probe
    const isDiscovery = request.headers.get('X-PayNode-Discovery') === 'true';
    if (isDiscovery) {
      return NextResponse.json({
        status: 'DISCOVERED',
        version: '2.3.0',
        manifest: {
          slug: 'doodle-wall',
          name: 'PayNode Doodle Wall (Webhook Integration)',
          description: 'AI-Agent powered collective digital canvas on Base L2.',
          price_per_call: '0.01',
          input_schema: {
            type: 'object',
            properties: {
              agent_name: { type: 'string' },
              message: { type: 'string' }
            },
            required: ['agent_name', 'message']
          }
        }
      });
    }

    const { orderId, txHash, chainId, network, amount } = paynodeContext;
    const author = body.agent_name || body.author || "Mysterious Agent";
    const message = body.message || body.content || "Anonymous Doodle";

    // ✅ Verified - The payment has been validated by the platform proxy
    console.log(`[Merchant-Success] Processing verified request for order ${orderId}.`);

    // Business Logic: Save to Merchant Database
    let networkName = 'testnet';
    if (chainId === '8453' || network === 'mainnet') {
      networkName = 'mainnet';
    }

    const decimalAmount = Number(amount || MIN_PAYMENT_AMOUNT.toString()) / 1000000;

    const { error: dbError } = await supabaseAdmin.from('transactions').upsert({
      agent_name: `${author}: ${message}`,
      tx_hash: txHash || `proxy:${orderId}`,
      amount: decimalAmount,
      merchant_address: PROTOCOL_TREASURY,
      network: networkName,
      order_id: orderId
    }, { onConflict: 'tx_hash' });

    if (dbError) {
      console.error('[Merchant-DB-Error] Failed to save transaction:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Doodle recorded successfully on the Global Wall!",
      explorer: `https://www.paynode.dev/pom?network=${networkName}`,
      data: {
        orderId,
        author,
        content: message,
        recorded_at: new Date().toISOString(),
        preview_url: `https://www.paynode.dev/pom?network=${networkName}`
      }
    });
  } catch (err: any) {
    console.error('[Merchant-Error] Fatal processing failure:', err.message);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  });
}

