import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BASE_SEPOLIA_CONFIG } from '../../../pom/config';
import { supabaseAdmin } from '../../../pom/lib/supabase-admin';

/**
 * NEW X402 V2 SPECIFIC DEMO (Standalone)
 * This is a separate endpoint for testing the new V2 standard compatibility.
 */
const RPC_URL = process.env.TESTNET_RPC_URLS || BASE_SEPOLIA_CONFIG.rpcUrls[0];

export async function POST(req: NextRequest) {
  const DEMO_PRIVATE_KEY = process.env.DEMO_FAUCET_KEY;
  if (!DEMO_PRIVATE_KEY) {
    return NextResponse.json({ error: "CONFIGURATION_ERROR", message: "DEMO_FAUCET_KEY is not configured." }, { status: 500 });
  }

  try {
    const { agent_name } = await req.json();
    const baseUrl = new URL(req.url).origin;

    // 1. Handshake to the NEW X402 interface
    const initialRes = await fetch(`${baseUrl}/api/test/x402?network=testnet`, {
      method: 'POST',
      body: JSON.stringify({ agent_name })
    });

    if (initialRes.status !== 402) {
      return NextResponse.json({ error: "X402 Handshake failed", status: initialRes.status }, { status: 500 });
    }

    const v2Req = await initialRes.json();
    const requirement = v2Req.accepts[0];

    // 2. Client-side signing (Real key)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEMO_PRIVATE_KEY!, provider);

    const domain = {
      name: requirement.extra.name || "USD Coin",
      version: requirement.extra.version || "2",
      chainId: parseInt(requirement.network.split(':')[1]),
      verifyingContract: requirement.asset
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };

    const validBefore = Math.floor(Date.now() / 1000) + 600;
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    const authorization = {
      from: wallet.address,
      to: requirement.payTo,
      value: requirement.amount,
      validAfter: 0,
      validBefore: validBefore,
      nonce: nonce
    };

    const signature = await wallet.signTypedData(domain, types, authorization);

    // 3. Construct Payload
    const orderId = `eip3009_demo_${Date.now()}_${ethers.hexlify(ethers.randomBytes(4))}`;
    const unifiedPayload = {
      version: "2.2.0",
      type: "eip3009",
      orderId: orderId,
      payload: {
        signature,
        authorization: {
          ...authorization,
          value: authorization.value.toString()
        }
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(unifiedPayload)).toString('base64');

    // 4. Retry and Verify
    const finalRes = await fetch(`${baseUrl}/api/test/x402?network=testnet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-402-Payload': base64Payload,
        'X-402-Order-Id': orderId
      },
      body: JSON.stringify({ agent_name })
    });

    const result = await finalRes.json();

    if (!finalRes.ok || result.error || result.success === false) {
      console.error("[Demo_Verification_Failed]:", result.errorReason || result.error);
      return NextResponse.json({
        ...result,
        txHash: `eip3009_failed:${nonce.slice(0, 16)}`,
        standard: "x402-v2",
        payload_preview: { payer: wallet.address, nonce: nonce }
      }, { status: finalRes.status });
    }

    let settlementTxHash = null;
    try {
      const tokenContract = new ethers.Contract(
        requirement.asset,
        ["function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external"],
        wallet
      );

      const sig = ethers.Signature.from(signature);
      const currentNonce = await provider.getTransactionCount(wallet.address, "pending");

      const tx = await tokenContract.transferWithAuthorization(
        authorization.from,
        authorization.to,
        authorization.value,
        authorization.validAfter,
        authorization.validBefore,
        authorization.nonce,
        sig.v,
        sig.r,
        sig.s,
        { nonce: currentNonce, gasLimit: 150000 }
      );

      console.log(`[Demo] On-chain settlement tx submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`[Demo] Settlement confirmed in block: ${receipt.blockNumber}`);

      const { error: updateError } = await supabaseAdmin
        .from('transactions')
        .update({ tx_hash: tx.hash })
        .eq('order_id', orderId);

      if (updateError) {
        console.error("[Demo_DB_Update_Error]: Failed to update tx_hash in database", {
          order_id: orderId,
          tx_hash: tx.hash,
          error: updateError.message
        });
      } else {
        console.log(`[Demo] Database updated successfully: order_id=${orderId} -> tx_hash=${tx.hash}`);
      }

      settlementTxHash = tx.hash;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("[Demo_AutoSettle_Failed]: On-chain settlement failed", {
        order_id: orderId,
        error: errorMsg,
        wallet: wallet.address
      });

      // 🛡️ Robustness: Mark as settlement failed in DB
      await supabaseAdmin
        .from('transactions')
        .update({ agent_name: `${agent_name}_SETTLEMENT_FAILED` })
        .eq('order_id', orderId);
    }

    return NextResponse.json({
      ...result,
      txHash: (settlementTxHash || `eip3009:${signature.slice(0, 58)}`),
      standard: "x402-v2",
      payload_preview: { payer: wallet.address, nonce: nonce }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
