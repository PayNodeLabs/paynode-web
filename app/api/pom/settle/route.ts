import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getNetworkConfig } from '../config';

export async function POST(req: NextRequest) {
    try {
        const { orderId } = await req.json();
        if (!orderId) {
            return NextResponse.json({ error: "orderId is required" }, { status: 400 });
        }

        // 1. Fetch the transaction record
        const { data: record, error: fetchError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('order_id', orderId)
            .single();

        if (fetchError || !record) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        // 2. Check if it's already settled (on-chain hash)
        if (record.tx_hash.startsWith('0x') && record.tx_hash.length === 66) {
            return NextResponse.json({ error: "Already settled on-chain" }, { status: 400 });
        }

        // 3. Extract the Base64 payload from the tx_hash field 
        if (!record.tx_hash.startsWith('auth:') && !record.tx_hash.startsWith('eip3009:')) {
            return NextResponse.json({ error: "No signature payload available for settlement. This might be a legacy record." }, { status: 400 });
        }

        const rawData = record.tx_hash.split(':').slice(1).join(':');
        let unifiedPayload;
        try {
            unifiedPayload = JSON.parse(Buffer.from(rawData, 'base64').toString());
        } catch {
            return NextResponse.json({ error: "CORRUPT_DATA: Payload in DB is not valid Base64." }, { status: 500 });
        }

        if (unifiedPayload.type !== 'eip3009') {
            return NextResponse.json({ error: "Only EIP-3009 settlements are supported for manual trigger." }, { status: 400 });
        }

        const DEMO_PRIVATE_KEY = process.env.DEMO_FAUCET_KEY;
        if (!DEMO_PRIVATE_KEY) {
            return NextResponse.json({ error: "MERCHANT_KEY_MISSING: Cannot settle without a private key." }, { status: 500 });
        }

        const config = getNetworkConfig(record.network === 'mainnet');
        const { settleTransferWithAuthorization } = await import('../lib/settle-payment');
        const payload = unifiedPayload.payload;

        const realTxHash = await settleTransferWithAuthorization(payload.signature, payload.authorization, {
            rpcUrl: config.rpcUrls[0],
            tokenAddress: config.usdcAddress,
            privateKey: DEMO_PRIVATE_KEY
        });

        // 4. Update the DB with the real tx hash
        await supabaseAdmin.from('transactions').update({ tx_hash: realTxHash }).eq('order_id', orderId);

        return NextResponse.json({ 
            success: true, 
            txHash: realTxHash,
            message: "Successfully settled manually on-chain."
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
