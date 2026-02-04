
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reset() {
    console.log("🧨 WIPING Usage Logs...");

    // 1. Delete ALL known logs by model name
    // This bypasses potential restrictions on "delete all" if any
    const modelsToDelete = [
        'llama-3.3-70b',
        'llama3.1-8b',
        'gpt-oss-120b',
        'qwen-3-32b',
        'zai-glm-4.7',
        'Historical Data',
        'Historical Request'
    ];

    const { error: deleteError } = await supabase
        .from('usage_logs')
        .delete()
        .in('model', modelsToDelete);

    if (deleteError) {
        console.error("Delete failed:", JSON.stringify(deleteError, null, 2));
        return;
    }

    console.log("🌱 Seeding Exact Data...");

    // 2. Insert Exact Values from Screenshot
    // gpt-oss-120b: 3.2K
    // llama3.1-8b: 5.9K
    // qwen-3-32b: 6.9K
    // zai-glm-4.7: 3.5K
    // Total Target: 236.9K
    // Sum of above: 19.5K
    // Remainder for Llama-3.3-70b: 236.9K - 19.5K = 217.4K

    const seeds = [
        { model: 'gpt-oss-120b', tokens: 3200 },
        { model: 'llama3.1-8b', tokens: 5900 },
        { model: 'qwen-3-32b', tokens: 6900 },
        { model: 'zai-glm-4.7', tokens: 3500 },
        { model: 'llama-3.3-70b', tokens: 217400 }
    ];

    for (const seed of seeds) {
        await supabase.from('usage_logs').insert({
            model: seed.model,
            tokens_in: 0,
            tokens_out: seed.tokens,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        });
    }

    console.log("✅ Reset Complete! Total should match 236.9K");
}

reset();
