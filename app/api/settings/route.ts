import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('chatbot_settings')
            .select('value')
            .eq('key', 'guardrails')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found, return default structure (empty/null) so frontend can handle it
                return Response.json({});
            }
            throw error;
        }

        return Response.json(data.value);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate minimal structure if needed, for now trust the frontend structure matches the schema
        const { error } = await supabase
            .from('chatbot_settings')
            .upsert({
                key: 'guardrails',
                value: body,
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error saving settings:', error);
        return Response.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
