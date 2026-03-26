import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BASE_SEPOLIA_CONFIG } from '../config';
import type { PaymentRequirements } from '@paynodelabs/sdk-js';

export const maxDuration = 15;

let executionQueue: Promise<unknown> = Promise.resolve();
let nextNonce: number | null = null;

const DEMO_PRIVATE_KEY = process.env.DEMO_FAUCET_KEY;
if (!DEMO_PRIVATE_KEY) throw new Error("DEMO_FAUCET_KEY environment variable is required");
const RPC_URL = process.env.TESTNET_RPC_URLS || BASE_SEPOLIA_CONFIG.rpcUrls[0];

const ROUTER_ABI = ["function pay(address token, address merchant, uint256 amount, bytes32 orderId) public"];
const ERC20_ABI = [
  "function approve(address spender, uint256 value) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)"
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { agent_name } = await req.json();
  const baseUrl = new URL(req.url).origin;

  return new Promise((resolve) => {
    executionQueue = executionQueue.then(async () => {
      try {
        const result = await executeTransaction(agent_name, baseUrl);
        resolve(NextResponse.json(result));
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("[Demo_API_Fatal]:", error.message);
        const errStr = error.message.toLowerCase();

        nextNonce = null;

        if (errStr.includes("nonce") || errStr.includes("underpriced") || errStr.includes("already known")) {
          resolve(NextResponse.json({ error: "NETWORK_CONGESTION", message: "EVM Nonce Syncing... Re-trying now." }, { status: 429 }));
        } else {
          resolve(NextResponse.json({ error: "EXECUTION_ERROR", message: error.message }, { status: 500 }));
        }
      }
    });
  });
}

async function executeTransaction(agent_name: string, baseUrl: string) {
  const initialRes = await fetch(`${baseUrl}/api/pom?network=testnet`, {
    method: 'POST',
    body: JSON.stringify({ agent_name })
  });

  const x402Required = initialRes.headers.get('X-402-Required');
  if (!x402Required) {
    throw new Error("Invalid 402 response: Missing X-402-Required header");
  }

  const requirements = JSON.parse(Buffer.from(x402Required, 'base64').toString());
  const onchainReq = requirements.accepts.find((r: PaymentRequirements) => r.type === 'onchain');
  if (!onchainReq) {
    throw new Error("No onchain payment requirement found");
  }

  const contract = onchainReq.router;
  const merchant = onchainReq.payTo;
  const amount = onchainReq.amount;
  const token = onchainReq.asset;
  const orderId = `demo_${Date.now()}_${ethers.hexlify(ethers.randomBytes(4))}`;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEMO_PRIVATE_KEY!, provider);

  if (nextNonce === null) {
    nextNonce = await provider.getTransactionCount(wallet.address, "pending");
  }

  const tokenContract = new ethers.Contract(token, ERC20_ABI, wallet);
  const currentAllowance = await tokenContract.allowance(wallet.address, contract);

  if (currentAllowance < BigInt(amount)) {
    console.log(`[Demo] Approving with Nonce: ${nextNonce}`);
    const approveTx = await tokenContract.approve(contract, amount, { nonce: nextNonce++ });
    await approveTx.wait();
  }

  const router = new ethers.Contract(contract, ROUTER_ABI, wallet);
  const orderIdBytes = ethers.id(orderId);

  console.log(`[Demo] Paying with Nonce: ${nextNonce}`);
  const payTx = await router.pay(token, merchant, amount, orderIdBytes, { nonce: nextNonce++ });
  const receipt = await payTx.wait();

  const unifiedPayload = {
    version: "3.1",
    type: "onchain",
    orderId: orderId,
    payload: { txHash: receipt.hash }
  };

  const b64Payload = Buffer.from(JSON.stringify(unifiedPayload)).toString('base64');

  const finalRes = await fetch(`${baseUrl}/api/pom?network=testnet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-402-Payload': b64Payload,
      'X-402-Order-Id': orderId
    },
    body: JSON.stringify({ agent_name })
  });

  const result = await finalRes.json();
  return { ...result, txHash: receipt.hash };
}
