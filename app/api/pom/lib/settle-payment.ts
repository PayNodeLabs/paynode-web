import { ethers, JsonRpcProvider } from 'ethers';
import { supabaseAdmin } from './supabase-admin';

export interface SettleOptions {
    rpcUrl: string;
    tokenAddress: string;
    privateKey: string;
}

/**
 * [PayNode-Web Utility]
 * Broadcasts an EIP-3009 TransferWithAuthorization signature to the blockchain.
 * This is used to "collect" the funds authorized by an agent.
 */
export async function settleTransferWithAuthorization(
    signature: string,
    authorization: {
        from: string;
        to: string;
        value: string | bigint;
        validAfter: number | string;
        validBefore: number | string;
        nonce: string;
    },
    options: SettleOptions
): Promise<string> {
    const provider = new JsonRpcProvider(options.rpcUrl);
    const wallet = new ethers.Wallet(options.privateKey, provider);

    const tokenContract = new ethers.Contract(
        options.tokenAddress,
        [
            "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external"
        ],
        wallet
    );

    const sig = ethers.Signature.from(signature);
    
    // We use "pending" nonce to allow concurrent settlements if the wallet has enough gas.
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

    console.log(`[Settlement] Transaction submitted: ${tx.hash} for nonce ${authorization.nonce}`);
    
    // We don't necessarily need to block the response on completion, 
    // but the demo often waits. Here we return the promise of wait() if needed,
    // or just the hash.
    return tx.hash;
}
