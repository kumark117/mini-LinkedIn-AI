import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { getServerFastApiBaseUrl } from '@/lib/serverFastApiBaseUrl';

const SummarizeBodySchema = z
  .object({
    user_id: z.number().int().nullable().optional()
  })
  .partial();

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const baseUrl = getServerFastApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Missing FASTAPI_BASE_URL' }, { status: 500 });
  }

  // Read user_id from cookie for the agent workflow.
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const cookieUserId = auth?.userId ?? null;

  const body = await req.json().catch(() => null);
  const parsed = SummarizeBodySchema.safeParse(body);
  const user_id = parsed.success ? parsed.data.user_id : cookieUserId;

  const resp = await fetch(`${baseUrl}/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user_id ?? cookieUserId })
  });

  const data = await resp.json().catch(() => ({}));
  return NextResponse.json(data, { status: resp.status });
}

