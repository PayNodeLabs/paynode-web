import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig, PROTOCOL_TREASURY, MIN_PAYMENT_AMOUNT } from './config';
import { supabaseAdmin } from './lib/supabase-admin';
import type { UnifiedPaymentPayload, ExactEVMPayload } from '@paynodelabs/sdk-js';



function isAllowedDomain(req: NextRequest) {
  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // Allow same-origin or non-browser requests
  // For production, you could explicitly check against process.env.SITE_URL
  try {
    if (origin && new URL(origin).host !== host) return false;
    if (referer && new URL(referer).host !== host) return false;
  } catch {
    return false;
  }
  return true;
}


export async function POST(req: NextRequest) {
  if (!isAllowedDomain(req)) {
    return NextResponse.json({ error: "FORBIDDEN: Cross-origin requests not allowed." }, { status: 403 });
  }
  try {
    const { agent_name } = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';

    const config = getNetworkConfig(isMainnet);
    const v2PayloadHeader = req.headers.get('PAYMENT-SIGNATURE') || req.headers.get('X-402-Payload');
    const orderId = req.headers.get('X-402-Order-Id') || req.headers.get('x-paynode-order-id'); 
    

    if (v2PayloadHeader) {
      // 🛡️ SECURITY FIX: Deep On-Chain Verification & Idempotency Store
      const { getPayNodeVerifier, parseUnifiedPayload } = await import('./lib/verify-payment');

      const verifier = await getPayNodeVerifier({
        rpcUrls: config.rpcUrls,
        chainId: config.chainId,
        routerAddress: config.routerAddress,
        usdcAddress: config.usdcAddress,
        isMainnet: isMainnet,
        orderId: orderId
      });

      let unifiedPayload: UnifiedPaymentPayload;
      try {
        unifiedPayload = parseUnifiedPayload(v2PayloadHeader, orderId);
      } catch {
        return NextResponse.json({ error: "invalid_payload: Failed to decode payment signature header." }, { status: 400 });
      }

      if (!orderId) {
        return NextResponse.json({ error: "order_mismatch: Missing 'X-402-Order-Id' in retry header." }, { status: 400 });
      }

      const result = await verifier.verify(unifiedPayload, {
        // NOTE: For the demo (Doodle Wall), we use the treasury address as the merchant.
        // In a real merchant application, replace PROTOCOL_TREASURY with the merchant's wallet address.
        merchantAddress: PROTOCOL_TREASURY,
        tokenAddress: config.usdcAddress,
        amount: BigInt(MIN_PAYMENT_AMOUNT).toString(),
        orderId: orderId
      }, unifiedPayload.type === 'eip3009' ? { name: "USD Coin", version: "2" } : {});

      if (!result.isValid) {
        return NextResponse.json({ error: `invalid_receipt: ${result.error?.message}` }, { status: 400 });
      }

      // 🛡️ Cleanup placeholder for EIP-3009 (since we use signature-based tx_hash for the final record)
      if (unifiedPayload.type === 'eip3009') {
        const nonce = (unifiedPayload.payload as ExactEVMPayload).authorization.nonce;
        await supabaseAdmin.from('transactions').delete().eq('tx_hash', nonce).eq('agent_name', '_pending');
      }

      // 2. Persistent Storage (Verified Data Only) - Overwrites the pending placeholder
      const txHash = ('txHash' in unifiedPayload.payload && unifiedPayload.payload.txHash)
        ? unifiedPayload.payload.txHash
        : (unifiedPayload.payload as ExactEVMPayload).signature;
      const { error: insertError } = await supabaseAdmin
        .from('transactions')
        .upsert({
          agent_name: agent_name || `Agent-${Math.floor(Math.random() * 1000)}`,
          tx_hash: txHash,
          amount: Number(BigInt(MIN_PAYMENT_AMOUNT).toString()) / 1e6,
          merchant_address: PROTOCOL_TREASURY,
          network: isMainnet ? 'mainnet' : 'testnet',
          order_id: orderId || `order_${Date.now()}`
        }, { onConflict: 'tx_hash' });

      if (insertError) {
        console.error("[Supabase_Upsert_Error]:", insertError.message);
        return NextResponse.json({ error: "internal_error: Failed to save verified transaction." }, { status: 500 });
      }


      const successResponse = NextResponse.json({
        status: "SUCCESS",
        txHash: txHash,
        message: `Verified! Welcome to the Doodle Wall, ${agent_name}`,
        explorer: `https://www.paynode.dev/pom?network=${isMainnet ? 'mainnet' : 'testnet'}`
      });

      // Add Settlement Confirmation Headers (V2 Standard)
      const payer = ('authorization' in unifiedPayload.payload) ? (unifiedPayload.payload as ExactEVMPayload).authorization.from : undefined;
      const settlementInfo = JSON.stringify({
        success: true,
        transaction: txHash,
        network: `eip155:${config.chainId}`,
        payer: payer
      });
      successResponse.headers.set('PAYMENT-RESPONSE', settlementInfo);
      successResponse.headers.set('X-PAYMENT-RESPONSE', settlementInfo);
      successResponse.headers.set('x-paynode-receipt', txHash);
      successResponse.headers.set('x-paynode-order-id', orderId || "");
      
      return successResponse;
    }

    const v2Response = {
      x402Version: 2,
      error: "Payment Required by PayNode",
      resource: {
        url: req.url,
        description: "PayNode Doodle Wall - AI Agent Art",
        mimeType: "application/json"
      },
      accepts: [
        {
          scheme: "exact",
          type: "eip3009",
          network: `eip155:${config.chainId}`,
          amount: MIN_PAYMENT_AMOUNT.toString(),
          asset: config.usdcAddress,
          payTo: PROTOCOL_TREASURY,
          maxTimeoutSeconds: 3600,
          extra: {
            name: "USD Coin",
            version: "2"
          }
        },
        {
          scheme: "exact",
          type: "onchain",
          network: `eip155:${config.chainId}`,
          amount: MIN_PAYMENT_AMOUNT.toString(),
          asset: config.usdcAddress,
          payTo: PROTOCOL_TREASURY,
          maxTimeoutSeconds: 3600,
          router: config.routerAddress
        }
      ]
    };

    const newOrderId = `pom_${Date.now()}`;
    const b64Required = Buffer.from(JSON.stringify(v2Response)).toString('base64');
    const response = NextResponse.json({
      status: "PAYMENT_REQUIRED",
      message: isMainnet ? "MAINNET DOGFOODING ACTIVE" : "SANDBOX TESTING ACTIVE",
      explorer: `https://www.paynode.dev/pom?network=${isMainnet ? 'mainnet' : 'testnet'}`
    }, { status: 402 });
    
    response.headers.set('PAYMENT-REQUIRED', b64Required);
    response.headers.set('X-402-Required', b64Required);
    response.headers.set('X-402-Order-Id', newOrderId);
    response.headers.set('x-paynode-order-id', newOrderId);
    return response;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAllowedDomain(req)) {
     return NextResponse.json({ error: "FORBIDDEN: Cross-origin requests not allowed." }, { status: 403 });
  }
  try {
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';
    const network = isMainnet ? 'mainnet' : 'testnet';

    const { data: feed, error: feedError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('network', network)
      .order('created_at', { ascending: false })
      .limit(50);

    if (feedError) throw feedError;

    // ⚡️ OPTIMIZATION: Get aggregated stats directly from Database via RPC
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_pom_stats', { p_network: network });

    if (statsError) {
      console.warn("[RPC_Fallback]: get_pom_stats not found, falling back to manual aggregation.");
      // Fallback to manual only if RPC is not yet created
      const { data: statsData } = await supabaseAdmin
        .from('transactions')
        .select('amount, agent_name')
        .eq('network', network);

      const counts: Record<string, number> = {};
      statsData?.forEach(e => counts[e.agent_name] = (counts[e.agent_name] || 0) + 1);

      const leaderboard = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
      const totalAmt = statsData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      return NextResponse.json({
        feed: feed.map(f => ({ agent: f.agent_name, txHash: f.tx_hash, time: new Date(f.created_at).toLocaleTimeString(), isMainnet: f.network === 'mainnet' })),
        leaderboard,
        merchantRevenue: (totalAmt * 0.99).toFixed(4),
        protocolFees: (totalAmt * 0.01).toFixed(6),
        totalTransactions: statsData?.length || 0
      });
    }

    // 🚀 High-performance path using DB-aggregated data
    const amountInMicro = BigInt(Math.round(Number(stats.total_amount) * 1e6));
    const merchantRevenue = (Number(amountInMicro * BigInt(99) / BigInt(100)) / 1e6).toFixed(4);
    const protocolFees = (Number(amountInMicro * BigInt(1) / BigInt(100)) / 1e6).toFixed(6);

    return NextResponse.json({
      feed: feed.map(f => ({
        agent: f.agent_name,
        txHash: f.tx_hash,
        time: new Date(f.created_at).toLocaleTimeString(),
        isMainnet: f.network === 'mainnet'
      })),
      leaderboard: (stats.leaderboard as { agent_name: string; tx_count: number }[]).map((a) => [a.agent_name, a.tx_count]),
      merchantRevenue,
      protocolFees,
      totalTransactions: stats.total_transactions
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
