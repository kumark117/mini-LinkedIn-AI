import { NextResponse } from 'next/server';
import { z } from 'zod';
import { zodErrorMessage } from '@/lib/zodErrorMessage';
import { getServerFastApiBaseUrl } from '@/lib/serverFastApiBaseUrl';

const EnhanceBodySchema = z.object({
  input: z.string().min(1).max(5000)
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const baseUrl = getServerFastApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Missing FASTAPI_BASE_URL' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = EnhanceBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const resp = await fetch(`${baseUrl}/ai/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: parsed.data.input })
  });

  const data = await resp.json().catch(() => ({}));
  return NextResponse.json(data, { status: resp.status });
}

