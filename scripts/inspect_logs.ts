
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    console.log("🔍 Inspecting Usage Logs...");

    const { data: logs, error } = await supabase
        .from('usage_logs')
        .select('model, tokens_in, tokens_out');

    if (error) { console.error(error); return; }

    const summary: Record<string, number> = {};

    logs?.forEach(log => {
        const total = (log.tokens_in || 0) + (log.tokens_out || 0);
        summary[log.model] = (summary[log.model] || 0) + total;
    });

    console.table(summary);
}

inspect();
