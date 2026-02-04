import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        // 1. Get Totals (Lifetime)
        const { data: totalTokensData, error: totalTokensError } = await supabase
            .from('usage_logs')
            .select('tokens_in, tokens_out'); // We'll sum in JS or use .rpc if we had one. JS is fine for now unless huge.
        // Actually, for performance with many logs, .rpc is better. But we don't have one.
        // Let's try to trust Supabase to handle a few thousand rows. If millions, we need aggregation.
        // For now, let's just use .select with no limit? That's dangerous.
        // Better: Create an RPC? Or just sum "Today" efficiently and "Total" we can cache?
        // Let's stick to simple select for now, assuming not huge scale yet.

        if (totalTokensError) throw totalTokensError;

        let totalTokens = 0;
        let totalRequests = totalTokensData.length;

        totalTokensData.forEach(row => {
            totalTokens += (row.tokens_in || 0) + (row.tokens_out || 0);
        });

        // 2. Get Today's Stats
        // We can filter the cached array in JS to save a DB call, or query DB.
        // Querying DB is cleaner for timezone handling if we did it there, but here we passed ISO string.
        const todayLogs = totalTokensData.filter(row => row.created_at >= todayIso);
        // Wait, 'created_at' is not in the select above.

        // Let's redo the strategy:
        // Query ALL logs with created_at.
        const { data: allLogs, error: logsError } = await supabase
            .from('usage_logs')
            .select('tokens_in, tokens_out, created_at');

        if (logsError) throw logsError;

        let lifetimeTokens = 0;
        let lifetimeRequests = 0;
        let todayTokens = 0;
        let todayRequests = 0;

        const now = new Date();
        // Reset to start of day in local time? Or UTC?
        // Usually API quotas are UTC or specific TZ. Cerebras is likely UTC. 
        // Let's treat today as UTC start of day.
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        allLogs.forEach(log => {
            const tokens = (log.tokens_in || 0) + (log.tokens_out || 0);
            lifetimeTokens += tokens;
            lifetimeRequests++;

            const logDate = new Date(log.created_at);
            if (logDate >= startOfDay) {
                todayTokens += tokens;
                todayRequests++;
            }
        });

        return Response.json({
            today_tokens: todayTokens,
            today_requests: todayRequests,
            total_tokens: lifetimeTokens,
            total_requests: lifetimeRequests
        });

    } catch (error) {
        console.error('Usage API Error:', error);
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}
