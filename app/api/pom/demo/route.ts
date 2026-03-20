import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BASE_SEPOLIA_CONFIG } from '../config';

export const maxDuration = 15;

// --- 🛡️ Global Atomic Queue & Nonce Manager ---
let executionQueue: Promise<any> = Promise.resolve();
let nextNonce: number | null = null;

const DEMO_PRIVATE_KEY = process.env.DEMO_FAUCET_KEY || "0x47e171e0ec23374952d35540a36922055655a0ce0a6b1612a322e859392e4627";
const RPC_URL = process.env.TESTNET_RPC_URLS || BASE_SEPOLIA_CONFIG.rpcUrl;

const ROUTER_ABI = ["function pay(address token, address merchant, uint256 amount, bytes32 orderId) public"];
const ERC20_ABI = [
  "function approve(address spender, uint256 value) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)"
];

export async function POST(req: NextRequest) {
  const { agent_name } = await req.json();
  const baseUrl = new URL(req.url).origin;

  // ENQUEUE THE REQUEST: Every call waits for the previous one to fully settle
  return new Promise((resolve) => {
    executionQueue = executionQueue.then(async () => {
      try {
        const result = await executeTransaction(agent_name, baseUrl);
        resolve(NextResponse.json(result));
      } catch (e: any) {
        console.error("[Demo_API_Fatal]:", e.message);
        const errStr = e.message.toLowerCase();
        
        // Reset nonce on error to force re-sync next time
        nextNonce = null;

        if (errStr.includes("nonce") || errStr.includes("underpriced") || errStr.includes("already known")) {
          resolve(NextResponse.json({ error: "NETWORK_CONGESTION", message: "EVM Nonce Syncing... Re-trying now." }, { status: 429 }));
        } else {
          resolve(NextResponse.json({ error: "EXECUTION_ERROR", message: e.message }, { status: 500 }));
        }
      }
    });
  });
}

async function executeTransaction(agent_name: string, baseUrl: string) {
  // 1. Handshake
  const initialRes = await fetch(`${baseUrl}/api/pom?network=testnet`, {
    method: 'POST',
    body: JSON.stringify({ agent_name })
  });

  const contract = initialRes.headers.get('x-paynode-contract')!;
  const merchant = initialRes.headers.get('x-paynode-merchant')!;
  const amount = initialRes.headers.get('x-paynode-amount')!;
  const token = initialRes.headers.get('x-paynode-token-address')!;
  const orderId = initialRes.headers.get('x-paynode-order-id')!;

  // 2. Chain Setup
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEMO_PRIVATE_KEY, provider);

  // 3. Nonce Management (Predictive)
  if (nextNonce === null) {
    nextNonce = await provider.getTransactionCount(wallet.address, "pending");
  }

  // 4. Check Allowance
  const tokenContract = new ethers.Contract(token, ERC20_ABI, wallet);
  const currentAllowance = await tokenContract.allowance(wallet.address, contract);
  
  if (currentAllowance < BigInt(amount)) {
    console.log(`[Demo] Approving with Nonce: ${nextNonce}`);
    const approveTx = await tokenContract.approve(contract, amount, { nonce: nextNonce++ });
    await approveTx.wait();
  }

  // 5. Execute Pay
  const router = new ethers.Contract(contract, ROUTER_ABI, wallet);
  const orderIdBytes = ethers.id(orderId);
  
  console.log(`[Demo] Paying with Nonce: ${nextNonce}`);
  const payTx = await router.pay(token, merchant, amount, orderIdBytes, { nonce: nextNonce++ });
  const receipt = await payTx.wait();

  // 6. Verification
  const finalRes = await fetch(`${baseUrl}/api/pom?network=testnet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paynode-receipt': receipt.hash,
      'x-paynode-order-id': orderId
    },
    body: JSON.stringify({ agent_name })
  });

  const result = await finalRes.json();
  return { ...result, txHash: receipt.hash };
}
