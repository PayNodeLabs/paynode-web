import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig } from './config';
import { supabase } from './lib/supabase';
import { Interface } from 'ethers';

const PAYNODE_ABI = [
  "event PaymentReceived(bytes32 indexed orderId, address indexed merchant, address indexed payer, address token, uint256 amount, uint256 fee, uint256 chainId)"
];
const iface = new Interface(PAYNODE_ABI);

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
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(config.rpcUrls[0]);
    const txReceipt = await provider.getTransactionReceipt(receipt);

    if (!txReceipt || txReceipt.status !== 1) {
      return NextResponse.json({ error: "INVALID_RECEIPT: Transaction not found or reverted." }, { status: 400 });
    }

    let paymentLog: any = null;
    for (const log of txReceipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === 'PaymentReceived') {
          paymentLog = parsed;
          break;
        }
      } catch (e) { continue; }
    }

    if (!paymentLog) {
      return NextResponse.json({ error: "INVALID_RECEIPT: No valid PaymentReceived event found." }, { status: 400 });
    }

    const args = paymentLog.args;
    // Verify Merchant (Must be our treasury)
    if (args.merchant.toLowerCase() !== config.treasury.toLowerCase()) {
      return NextResponse.json({ error: "INVALID_RECEIPT: Merchant mismatch." }, { status: 400 });
    }
    // Verify Token (Must be official USDC)
    if (args.token.toLowerCase() !== config.usdcAddress.toLowerCase()) {
      return NextResponse.json({ error: "INVALID_RECEIPT: Token mismatch." }, { status: 400 });
    }
    // Verify Amount (Min 0.01 USDC)
    if (BigInt(args.amount) < 10000n) {
      return NextResponse.json({ error: "INVALID_RECEIPT: Amount too low." }, { status: 400 });
    }
    // Verify Network
    if (Number(args.chainId) !== config.chainId) {
      return NextResponse.json({ error: "INVALID_RECEIPT: ChainId mismatch." }, { status: 400 });
    }

    // 2. Persistent Storage (Verified Data Only)
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        agent_name: agent_name || `Agent-${Math.floor(Math.random() * 1000)}`,
        tx_hash: receipt,
        amount: Number(args.amount) / 1e6,
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

    const { data: statsData, error: statsError } = await supabase
      .from('transactions')
      .select('amount, agent_name')
      .eq('network', network);

    if (statsError) throw statsError;

    const totalTransactions = statsData.length;
    const amountInMicro = statsData.reduce((acc, curr) => acc + BigInt(Math.round(Number(curr.amount) * 1e6)), BigInt(0));
    
    // Accurate 99/1 split display
    const merchantMicro = amountInMicro * BigInt(99) / BigInt(100);
    const protocolMicro = amountInMicro * BigInt(1) / BigInt(100);

    const merchantRevenue = (Number(merchantMicro) / 1e6).toFixed(4);
    const protocolFees = (Number(protocolMicro) / 1e6).toFixed(6);

    const counts: Record<string, number> = {};
    statsData.forEach((entry: {agent_name: string, amount: number}) => {
      counts[entry.agent_name] = (counts[entry.agent_name] || 0) + 1;
    });
    
    const leaderboard = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agent, count]) => ({ agent, count }));

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

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
