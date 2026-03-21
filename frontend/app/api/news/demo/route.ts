import { NextResponse } from 'next/server';

import { getServerFastApiBaseUrl } from '@/lib/serverFastApiBaseUrl';

/**
 * Proxies FastAPI GET /api/news/demo so the browser stays same-origin (no CORS).
 * Uses FASTAPI_BASE_URL (see serverFastApiBaseUrl — localhost → 127.0.0.1 for Node fetch).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = getServerFastApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error: 'missing_fastapi_base_url',
        items: [],
        feed_label: '',
        feed_url: ''
      },
      { status: 500 }
    );
  }

  const url = `${baseUrl}/api/news/demo`;
  try {
    const resp = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await resp.json().catch(() => ({
      error: 'invalid_json',
      items: [] as unknown[],
      feed_label: '',
      feed_url: ''
    }));
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json(
      {
        error: 'upstream_unreachable',
        items: [],
        feed_label: '',
        feed_url: ''
      },
      { status: 502 }
    );
  }
}
