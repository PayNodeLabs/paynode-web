import { PayNodeVerifier, UnifiedPaymentPayload, X402PayloadHelper } from '@paynodelabs/sdk-js';
import { supabaseAdmin } from './supabase-admin';
import { PROTOCOL_TREASURY } from '../config';

export async function getPayNodeVerifier(config: {
    rpcUrls: string[];
    chainId: number;
    routerAddress: string;
    usdcAddress: string;
    isMainnet: boolean;
    orderId: string | null;
    isEip3009?: boolean;
}) {
    const { isMainnet, orderId, isEip3009 } = config;

    return new PayNodeVerifier({
        rpcUrls: config.rpcUrls,
        chainId: config.chainId,
        contractAddress: config.routerAddress,
        store: {
            async checkAndSet(key: string) {
                // 1. Check if the hash/nonce is already consumed
                const { data: existing, error: selectError } = await supabaseAdmin.from('transactions').select('agent_name, order_id').eq('tx_hash', key).maybeSingle();

                if (selectError) console.error("[Idempotency_Select_Error]:", selectError.message);

                if (existing && existing.agent_name !== '_pending') {
                    console.warn(`[Idempotency_Rejected]: Key ${key} already consumed by ${existing.agent_name}`);
                    return false;
                }

                // 2. 🛡️ ONLY create placeholder for EIP-3009 (to lock nonces)
                // For direct on-chain, we don't need _pending because the real record will upsert the same tx_hash.
                if (isEip3009) {
                    const { error: upsertError } = await supabaseAdmin.from('transactions').upsert({
                        tx_hash: key,
                        agent_name: '_pending',
                        amount: 0,
                        merchant_address: PROTOCOL_TREASURY,
                        network: isMainnet ? 'mainnet' : 'testnet',
                        order_id: orderId || `pn_web_pending_${Date.now()}`
                    }, { onConflict: 'tx_hash' });

                    if (upsertError) {
                        console.error("[Idempotency_Upsert_Error]:", upsertError.message);
                        return false;
                    }
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
    return X402PayloadHelper.normalize(v2PayloadHeader, orderId || undefined);
}
