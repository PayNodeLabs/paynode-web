import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig } from './config';
import { supabase } from './lib/supabase';


export async function POST(req: NextRequest) {
  try {
    const { agent_name } = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';

    const config = getNetworkConfig(isMainnet);
    const receipt = req.headers.get('x-paynode-receipt');
    const orderId = req.headers.get('x-paynode-order-id');

    if (!receipt) {
      // 1. Handshake: Return Protocol Headers (v1.3 standard)
      const response = NextResponse.json({
        status: "PAYMENT_REQUIRED",
        message: isMainnet ? "MAINNET DOGFOODING ACTIVE" : "SANDBOX TESTING ACTIVE"
      }, { status: 402 });

      response.headers.set('x-paynode-contract', config.routerAddress);
      response.headers.set('x-paynode-merchant', config.treasury);
      response.headers.set('x-paynode-amount', "10000"); // 0.01 USDC
      response.headers.set('x-paynode-token-address', config.usdcAddress);
      response.headers.set('x-paynode-order-id', `order_${Date.now()}`);

      return response;
    }

    // 🛡️ SECURITY FIX 1: Idempotency (Prevent Replay Attacks)
    const { data: existing } = await supabase.from('transactions').select('id').eq('tx_hash', receipt).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "DUPLICATE_TRANSACTION: This receipt has already been consumed." }, { status: 400 });
    }

    // 🛡️ SECURITY FIX 2: Deep On-Chain Verification
    const { PayNodeVerifier } = await import('@paynodelabs/sdk-js');
    const verifier = new PayNodeVerifier({
      rpcUrls: config.rpcUrls,
      chainId: config.chainId,
      contractAddress: config.routerAddress
    });

    const result = await verifier.verifyPayment(receipt, {
      merchantAddress: config.treasury,
      tokenAddress: config.usdcAddress,
      amount: BigInt(10000),
      orderId: orderId || `order_${Date.now()}`
    });

    if (!result.isValid) {
      return NextResponse.json({ error: `INVALID_RECEIPT: ${result.error?.message}` }, { status: 400 });
    }

    // 2. Persistent Storage (Verified Data Only)
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        agent_name: agent_name || `Agent-${Math.floor(Math.random() * 1000)}`,
        tx_hash: receipt,
        amount: 10000 / 1e6,
        merchant_address: config.treasury,
        network: isMainnet ? 'mainnet' : 'testnet',
        order_id: orderId || `order_${Date.now()}`
      });

    if (insertError) {
      console.error("[Supabase_Insert_Error]:", insertError.message);
      return NextResponse.json({ error: "INTERNAL_ERROR: Failed to save verified transaction." }, { status: 500 });
    }

    return NextResponse.json({
      status: "SUCCESS",
      txHash: receipt,
      message: `Verified! Welcome to the Doodle Wall, ${agent_name}`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';
    const network = isMainnet ? 'mainnet' : 'testnet';

    const { data: feed, error: feedError } = await supabase
      .from('transactions')
      .select('*')
      .eq('network', network)
      .order('created_at', { ascending: false })
      .limit(50);

    if (feedError) throw feedError;

    // ⚡️ OPTIMIZATION: Get aggregated stats directly from Database via RPC
    const { data: stats, error: statsError } = await supabase
      .rpc('get_pom_stats', { p_network: network });

    if (statsError) {
      console.warn("[RPC_Fallback]: get_pom_stats not found, falling back to manual aggregation.");
      // Fallback to manual only if RPC is not yet created
      const { data: statsData } = await supabase
        .from('transactions')
        .select('amount, agent_name')
        .eq('network', network);
      
      const counts: Record<string, number> = {};
      statsData?.forEach(e => counts[e.agent_name] = (counts[e.agent_name] || 0) + 1);
      
      const leaderboard = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 20);
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
      leaderboard: stats.leaderboard.map((a: any) => [a.agent_name, a.tx_count]),
      merchantRevenue,
      protocolFees,
      totalTransactions: stats.total_transactions
    });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
