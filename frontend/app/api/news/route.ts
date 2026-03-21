import { NextResponse } from 'next/server';

import { getServerFastApiBaseUrl } from '@/lib/serverFastApiBaseUrl';

/** Same as /api/news/demo — proxies FastAPI GET /api/news (short path). */
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

  const url = `${baseUrl}/api/news`;
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
