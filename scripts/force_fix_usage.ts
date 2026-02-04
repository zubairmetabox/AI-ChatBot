
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceFix() {
    console.log("🚀 Starting Force Fix...");

    // 1. Calculate REAL usage (excluding historical placeholders)
    // We exclude 'Historical Data' and 'Historical Request'
    const { data: realLogs, error } = await supabase
        .from('usage_logs')
        .select('tokens_in, tokens_out')
        .neq('model', 'Historical Data')
        .neq('model', 'Historical Request'); // Also exclude dummy requests if they have 0 tokens (they do)

    if (error) { console.error(error); return; }

    const realTokenUsage = realLogs.reduce((acc, log) => acc + (log.tokens_in || 0) + (log.tokens_out || 0), 0);
    console.log(`📊 Real User Token Usage: ${realTokenUsage.toLocaleString()}`);

    // 2. Define Target
    const TARGET_TOTAL = 236900;

    // 3. Calculate needed history
    // If usage > target, we have a problem (negative history).
    let neededHistory = TARGET_TOTAL - realTokenUsage;
    if (neededHistory < 0) {
        console.warn("⚠️  Real usage > Target. Setting history to 0.");
        neededHistory = 0;
    }

    console.log(`🧮 Target: ${TARGET_TOTAL.toLocaleString()}`);
    console.log(`   Needed History: ${neededHistory.toLocaleString()}`);

    // 4. DELETE old historical rows
    console.log("🗑️  Deleting old historical data rows...");
    await supabase.from('usage_logs').delete().eq('model', 'Historical Data');

    // 5. INSERT new single historical row
    console.log("💾 Inserting new historical row...");
    const { error: insertError } = await supabase.from('usage_logs').insert({
        model: 'Historical Data',
        tokens_in: 0,
        tokens_out: neededHistory,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
    });

    if (insertError) {
        console.error("Insert failed:", insertError);
    } else {
        console.log("✅ Fix Complete!");
    }
}

forceFix();
