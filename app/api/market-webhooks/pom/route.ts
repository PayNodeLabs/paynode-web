import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/app/api/pom/lib/supabase-admin';
import { PROTOCOL_TREASURY, MIN_PAYMENT_AMOUNT } from '@/app/api/pom/config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const orderId = request.headers.get('X-PayNode-Request-Id');
    const timestamp = request.headers.get('X-PayNode-Timestamp');
    const signature = request.headers.get('X-PayNode-Signature');
    const externalApiCode = request.headers.get('X-PayNode-External-Api-Code');

    // 🛡️ Security Check: Trust-Proxy Mode (HMAC Verification)
    const hmacSecret = process.env.PLATFORM_HMAC_SECRET;
    if (!hmacSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('🔴 FATAL: PLATFORM_HMAC_SECRET is not set. Rejecting webhook.');
        return NextResponse.json({ error: 'configuration_error', message: 'Security secret not configured.' }, { status: 500 });
      }
    }
    const effectiveSecret = hmacSecret || 'dev_secret_override_in_prod';
    const expectedSig = crypto.createHmac('sha256', effectiveSecret)
      .update(`${orderId}${timestamp}`)
      .digest('hex');

    if (signature !== expectedSig) {
      console.error(`[Merchant-Auth-Failure] Invalid platform signature for order ${orderId}`);
      return NextResponse.json({ 
        error: 'unauthorized', 
        message: 'Invalid platform signature. Connection must go through PayNode Proxy.' 
      }, { status: 401 });
    }

    // ✅ Verified - The payment has been validated by the platform proxy
    console.log(`[Merchant-Success] Processing verified request for order ${orderId}. API Code: ${externalApiCode}`);

    // Business Logic: Save to Merchant Database (Legacy Transactions Table)
    const message = body.payload?.message || "Anonymous Doodle";
    const author = body.payload?.author || "Mysterious Agent";
    
    // We use the real transaction hash provided by the proxy
    const txHash = request.headers.get('X-PayNode-Transaction-Hash') || body.tx_hash || `proxy:${orderId}`; 
    const chainId = request.headers.get('X-PayNode-Chain-Id');
    const networkName = chainId === '8453' ? 'mainnet' : 'testnet';

    const { error: dbError } = await supabaseAdmin.from('transactions').upsert({
      agent_name: `${author}: ${message}`,
      tx_hash: txHash,
      amount: Number(MIN_PAYMENT_AMOUNT) / 1000000,
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
      data: {
        orderId,
        author,
        content: message,
        recorded_at: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('[Merchant-Error] Fatal processing failure:', err.message);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}
