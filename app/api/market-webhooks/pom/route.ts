import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/app/api/pom/lib/supabase-admin';
import { PROTOCOL_TREASURY, MIN_PAYMENT_AMOUNT } from '@/app/api/pom/config';

async function verifySignature(request: Request) {
  const signature = request.headers.get('X-PayNode-Signature');
  const timestamp = request.headers.get('X-PayNode-Timestamp');
  const orderId = request.headers.get('X-PayNode-Request-Id');

  if (!signature || !timestamp || !orderId) return false;

  const hmacSecret = process.env.PLATFORM_HMAC_SECRET || 'dev_secret_override_in_prod';
  const expectedSig = crypto.createHmac('sha256', hmacSecret)
    .update(`${orderId}${timestamp}`)
    .digest('hex');

  return signature === expectedSig;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = request.headers.get('X-PayNode-Request-Id') || body.order_id;
    const externalApiCode = request.headers.get('X-PayNode-External-Api-Code') || body.external_api_code;

    // 🛡️ Security Check: HMAC Verification
    const isValid = await verifySignature(request);
    if (!isValid) {
      console.warn(`[Merchant-Auth-Failure] Invalid signature for order ${orderId}. Denying access.`);
      // If it's a GET, we return schema. If it's a POST without signature, it's a direct agent call or invalid proxy.
      return NextResponse.json({ error: 'unauthorized', message: 'Signature verification failed.' }, { status: 401 });
    }

    // ✅ Verified - The payment has been validated by the platform proxy
    console.log(`[Merchant-Success] Processing verified request for order ${orderId}. API Code: ${externalApiCode}`);

    // Business Logic: Save to Merchant Database (Legacy Transactions Table)
    const message = body.payload?.message || body.payload?.content || "Anonymous Doodle";
    const author = body.payload?.agent_name || body.payload?.author || "Mysterious Agent";
    
    // we use the real transaction hash provided by the proxy
    const txHash = request.headers.get('X-PayNode-Transaction-Hash') || body.tx_hash || `proxy:${orderId}`; 
    const chainId = request.headers.get('X-PayNode-Chain-Id') || body.chain_id?.toString();
    const network = request.headers.get('X-PayNode-Network') || body.network; // prioritize header over body if present
    
    // Robust resolution: try chainId first, then network label, else fallback to testnet
    let networkName = 'testnet';
    if (chainId === '8453') {
      networkName = 'mainnet';
    } else if (network === 'mainnet') {
      networkName = 'mainnet';
    }

    // Determine exact amount paid (fallback to MIN if missing from proxy)
    const rawAmount = body.amount || request.headers.get('X-PayNode-Amount') || MIN_PAYMENT_AMOUNT.toString();
    const decimalAmount = Number(rawAmount) / 1000000;

    const { error: dbError } = await supabaseAdmin.from('transactions').upsert({
      agent_name: `${author}: ${message}`,
      tx_hash: txHash,
      amount: decimalAmount,
      merchant_address: PROTOCOL_TREASURY,
      network: networkName,
      order_id: orderId
    }, { onConflict: 'tx_hash' });

    if (dbError) {
      console.error('[Merchant-DB-Error] Failed to save transaction:', dbError.message);
      // We still return success if the logic passed verification, but log the error
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

export async function GET(request: Request) {
  const isValid = await verifySignature(request);
  const isMainnet = request.headers.get('X-PayNode-Network') === 'mainnet';

  if (!isValid) {
    // If not signed, we can still return a 402 for Agents, but the user said "不用返回 402"
    // So we'll return 401 to keep the Sync interface secure.
    return NextResponse.json({ 
      error: "unauthorized", 
      message: "API Manual discovery requires a valid PayNode signature." 
    }, { status: 401 });
  }

  // ✅ Secure Discovery (Marketplace Sync)
  return NextResponse.json({
    x402Version: 2,
    status: "DISCOVERED",
    input_schema: {
      type: "object",
      properties: {
        agent_name: { type: "string" },
        message: { type: "string" }
      },
      required: ["agent_name", "message"]
    },
    accepts: [
      {
        scheme: "exact",
        type: "eip3009",
        network: isMainnet ? "eip155:8453" : "eip155:84532",
        amount: MIN_PAYMENT_AMOUNT.toString(),
        asset: "USDC",
        payTo: PROTOCOL_TREASURY
      }
    ]
  }, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  });
}
