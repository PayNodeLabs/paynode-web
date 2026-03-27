import { PayNodeVerifier, UnifiedPaymentPayload } from '@paynodelabs/sdk-js';
import { supabaseAdmin } from './supabase-admin';
import { PROTOCOL_TREASURY } from '../config';

export async function getPayNodeVerifier(config: { rpcUrls: string[]; chainId: number; routerAddress: string; usdcAddress: string; isMainnet: boolean; orderId: string | null }) {
    const { isMainnet, orderId } = config;
    
    return new PayNodeVerifier({
        rpcUrls: config.rpcUrls,
        chainId: config.chainId,
        contractAddress: config.routerAddress,
        store: {
            async checkAndSet(key: string) {
                // 🛡️ Proactive locking: Upsert a pending record. 
                // If it already exists and is NOT _pending, it's already consumed.
                const { data: existing, error: selectError } = await supabaseAdmin.from('transactions').select('agent_name, order_id').eq('tx_hash', key).maybeSingle();
                
                if (selectError) {
                    console.error("[Idempotency_Select_Error]:", selectError.message);
                }

                if (existing && existing.agent_name !== '_pending') {
                    console.warn(`[Idempotency_Rejected]: Key ${key} already consumed by ${existing.agent_name} for order ${existing.order_id}`);
                    return false; // Already consumed by a real agent
                }

                // Placeholder to "lock" or update the transaction hash early
                const { error: upsertError } = await supabaseAdmin.from('transactions').upsert({
                    tx_hash: key,
                    agent_name: '_pending',
                    amount: 0,
                    merchant_address: PROTOCOL_TREASURY, // 🛡️ Fix Not-Null constraint
                    network: isMainnet ? 'mainnet' : 'testnet',
                    order_id: orderId || `pending_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                }, { onConflict: 'tx_hash' });
                
                if (upsertError) {
                    console.error("[Idempotency_Upsert_Fatal]:", upsertError.message, "Key:", key, "OrderId:", orderId);
                    return false;
                }

                return true;
            },
            async delete(key: string): Promise<void> {
                // Cleanup the pending placeholder if verification fails
                await supabaseAdmin.from('transactions').delete().eq('tx_hash', key).eq('agent_name', '_pending');
            }
        },
        acceptedTokens: [config.usdcAddress]
    });
}

export function parseUnifiedPayload(v2PayloadHeader: string, orderId: string | null): UnifiedPaymentPayload {
    const parsed = JSON.parse(Buffer.from(v2PayloadHeader, 'base64').toString());
    
    // Handle Official X402 V2 format mapping
    if (parsed.x402Version === 2 && parsed.accepted) {
        return {
            version: "2.2.1",
            type: parsed._paynode?.type || (parsed.accepted.extra?.name === "USD Coin" ? 'eip3009' : 'onchain'),
            orderId: parsed._paynode?.orderId || orderId || "",
            payload: parsed.payload
        };
    } else {
        return parsed as UnifiedPaymentPayload;
    }
}
