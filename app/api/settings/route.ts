import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: rows, error } = await supabase
            .from('chatbot_settings')
            .select('key, value');

        if (error) throw error;

        const settings = rows?.reduce((acc: any, row: any) => {
            if (row.key === 'guardrails') {
                return { ...acc, ...row.value };
            }
            if (row.key === 'model_config') {
                return { ...acc, model_config: row.value };
            }
            return acc;
        }, {}) || {};

        return Response.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Extract model_config if present
        const { model_config, ...guardrails } = body;

        const updates = [];

        // 1. Save Guardrails (everything else)
        updates.push(supabase
            .from('chatbot_settings')
            .upsert({
                key: 'guardrails',
                value: guardrails,
                updated_at: new Date().toISOString(),
            }));

        // 2. Save Model Config if present
        if (model_config) {
            updates.push(supabase
                .from('chatbot_settings')
                .upsert({
                    key: 'model_config',
                    value: model_config,
                    updated_at: new Date().toISOString(),
                }));
        }

        const results = await Promise.all(updates);

        // Check for errors
        const errors = results.map(r => r.error).filter(Boolean);
        if (errors.length > 0) throw errors[0];

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error saving settings:', error);
        return Response.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
