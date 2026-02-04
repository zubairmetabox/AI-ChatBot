
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUsage() {
    console.log("🔍 Checking Usage Logs...");

    // 1. Get Current Total
    const { data: allLogs, error } = await supabase
        .from('usage_logs')
        .select('tokens_in, tokens_out, model');

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    const currentTotal = allLogs.reduce((acc, log) => acc + (log.tokens_in || 0) + (log.tokens_out || 0), 0);
    console.log(`📊 Current App Total: ${currentTotal.toLocaleString()}`);

    // 2. Identify "Historical Data" row
    const historicRow = allLogs.find(l => l.model === 'Historical Data');

    // We want Target Total = 236,900
    const TARGET_TOTAL = 236900;

    // Calculate what the "Historical Data" row SHOULD be to make the Sum match the Target.
    // Total = (Other Rows) + (Historical Row)
    // Target = (Current Total - Current Historic) + (New Historic)
    // New Historic = Target - (Current Total - Current Historic)

    const currentHistoricVal = (historicRow?.tokens_in || 0) + (historicRow?.tokens_out || 0);
    const otherUsage = currentTotal - currentHistoricVal;

    const newHistoricVal = TARGET_TOTAL - otherUsage;

    console.log(`🧮 Calculation:`);
    console.log(`   Target: ${TARGET_TOTAL.toLocaleString()}`);
    console.log(`   - Other Real Usage: ${otherUsage.toLocaleString()}`);
    console.log(`   = New Historic Value: ${newHistoricVal.toLocaleString()}`);

    if (newHistoricVal < 0) {
        console.warn("⚠️ Warning: Real usage exceeds the target! Cannot adjust historical data to match exactly without negative numbers.");
        // We will just set it to 0 or leave it? 
        // If usage > target, then Cerebras is showing LESS than what we actually logged? That would mean we over-counted or Cerebras is delayed.
        // User says Cerebras is 236.9K. App is 250k.
        // So we likely have 217k historic + 33k real.
        // 217k was "last month".
        // If we want total to be 236k, we need to lower historic.
    }

    // 3. Update the row
    // We'll put all the value in 'tokens_out' for simplicity, or split it.
    // 'tokens_in' is usually 0 for the aggregate row in my previous seed? 
    // Previous seed: ('Historical Data', 0, 217300)

    console.log("🛠️  Updating 'Historical Data' row...");

    const { error: updateError } = await supabase
        .from('usage_logs')
        .update({ tokens_out: newHistoricVal, tokens_in: 0 })
        .eq('model', 'Historical Data');

    if (updateError) {
        console.error("Failed to update:", updateError);
    } else {
        console.log("✅ Update Successful!");
        console.log(`   The app should now show approx: ${TARGET_TOTAL.toLocaleString()}`);
    }
}

fixUsage();
