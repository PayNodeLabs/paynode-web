import { supabaseAdmin } from './supabase-admin';
import { settleTransferWithAuthorization } from './settle-payment';
import type { ExactEVMPayload } from '@paynodelabs/sdk-js';

export interface SettleAndUpdateOptions {
    rpcUrl: string;
    tokenAddress: string;
    privateKey: string;
    orderId: string;
    agentName: string;
}

/**
 * [PayNode-Web Utility]
 * Performs the full EIP-3009 settlement cycle:
 * 1. Broadcasts the authorization to the blockchain.
 * 2. Updates the transactions table with the real tx_hash.
 * 3. Cleans up any pending placeholders for EIP-3009 to prevent duplicate display.
 */
export async function performSettleAndUpdate(
    payload: ExactEVMPayload,
    options: SettleAndUpdateOptions
): Promise<string> {
    const { orderId, agentName } = options;

    try {
        console.log(`[AutoSettle] Starting collection for order ${orderId}...`);

        // 1. On-chain settlement (Fire and forget from the main thread's perspective, handled here)
        const realTxHash = await settleTransferWithAuthorization(
            payload.signature,
            payload.authorization,
            {
                rpcUrl: options.rpcUrl,
                tokenAddress: options.tokenAddress,
                privateKey: options.privateKey
            }
        );

        // 2. Precision Update: Update ONLY the non-pending record that holds the auth payload
        // We use neq('agent_name', '_pending') to make sure we hit the "persistent" record
        const { error: updateError } = await supabaseAdmin
            .from('transactions')
            .update({ tx_hash: realTxHash })
            .eq('order_id', orderId)
            .neq('agent_name', '_pending');
        
        if (updateError) {
            console.error(`[AutoSettle_DB_Error] Order ${orderId}:`, updateError.message);
        } else {
            console.log(`[AutoSettle] Successfully collected funds for order ${orderId}. Tx: ${realTxHash}`);
        }

        // 3. 🛡️ Cleanup placeholder for EIP-3009 by orderId to prevent race conditions 
        // We do this after the update so we're sure the main record was at least attempted to be updated.
        await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('order_id', orderId)
            .eq('agent_name', '_pending');

        return realTxHash;

    } catch (err: any) {
        console.error(`[AutoSettle_Error] Failed to collect for order ${orderId}:`, err.message);
        
        // Mark as failed in DB if possible so we know it's not pending but "settlement failed"
        await supabaseAdmin
            .from('transactions')
            .update({ agent_name: `${agentName ? agentName : 'Unknown'}_SETTLEMENT_FAILED` })
            .eq('order_id', orderId);
            
        throw err;
    }
}
