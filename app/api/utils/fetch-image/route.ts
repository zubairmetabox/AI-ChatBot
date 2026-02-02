import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log(`Fetching image from: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('URL does not point to a valid image');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        // Check size (e.g. limit to 2MB)
        if (buffer.length > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 400 });
        }

        return NextResponse.json({ dataUrl });
    } catch (error: any) {
        console.error('Fetch image error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
    }
}
