import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig } from './config';
import { supabase } from './lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { agent_name } = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';
    
    // 🛡️ Load production params
    const config = getNetworkConfig(isMainnet);

    const receipt = req.headers.get('x-paynode-receipt');
    const orderId = req.headers.get('x-paynode-order-id');

    if (!receipt) {
      // 1. Handshake: Return Protocol Headers
      const response = NextResponse.json({ 
        status: "PAYMENT_REQUIRED",
        message: isMainnet ? "MAINNET DOGFOODING ACTIVE" : "SANDBOX TESTING ACTIVE"
      }, { status: 402 });

      response.headers.set('x-paynode-contract', config.routerAddress);
      response.headers.set('x-paynode-merchant', config.treasury);
      response.headers.set('x-paynode-amount', "10000"); // 0.01 USDC (6 decimals)
      response.headers.set('x-paynode-token-address', config.usdcAddress);
      response.headers.set('x-paynode-order-id', `order_${Date.now()}`);
      
      return response;
    }

    // 2. Persistent Storage in Supabase
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        agent_name: agent_name || `Agent-${Math.floor(Math.random() * 1000)}`,
        tx_hash: receipt,
        amount: 0.01,
        merchant_address: config.treasury,
        network: isMainnet ? 'mainnet' : 'testnet',
        order_id: orderId || `order_${Date.now()}`
      });

    if (insertError) {
      console.error("[Supabase_Insert_Error]:", insertError.message, insertError.details);
      // Even if DB fails, don't break the payment response
    }

    return NextResponse.json({
      status: "SUCCESS",
      txHash: receipt,
      message: `Access granted for ${agent_name}`
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const isMainnet = searchParams.get('network') === 'mainnet';
    const network = isMainnet ? 'mainnet' : 'testnet';

    // 1. Fetch recent transactions
    const { data: feed, error: feedError } = await supabase
      .from('transactions')
      .select('*')
      .eq('network', network)
      .order('created_at', { ascending: false })
      .limit(50);

    if (feedError) throw feedError;

    // 2. Fetch Aggregates (Volume, Count)
    const { data: statsData, error: statsError } = await supabase
      .from('transactions')
      .select('amount, agent_name')
      .eq('network', network);

    if (statsError) throw statsError;

    const totalTransactions = statsData.length;
    const totalVolume = statsData.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const merchantRevenue = (totalVolume * 0.99).toFixed(4);
    const protocolFees = (totalVolume * 0.01).toFixed(6);

    // 3. Leaderboard logic
    const counts: Record<string, number> = {};
    statsData.forEach((entry: {agent_name: string, amount: number}) => {
      counts[entry.agent_name] = (counts[entry.agent_name] || 0) + 1;
    });
    const leaderboard = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return NextResponse.json({
      feed: feed.map(f => ({
        agent: f.agent_name,
        txHash: f.tx_hash,
        time: new Date(f.created_at).toLocaleTimeString(),
        isMainnet: f.network === 'mainnet'
      })),
      leaderboard,
      merchantRevenue,
      protocolFees,
      totalTransactions
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
