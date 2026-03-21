import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { AUTH_COOKIE_NAME, signAuthToken, verifyAuthToken } from '@/lib/auth';
import { isUserIdInDatabase } from '@/lib/sessionUser';

export const runtime = 'nodejs';

/**
 * Ensures a session cookie for the seeded `guest` user when the visitor has no valid auth yet.
 * Called once on app load from the client; does not replace an existing valid login.
 *
 * Body `{ "force": true }` (JSON) always re-issues the guest cookie — used after sign-out so the
 * next UI pass cannot keep a stale session if logout + guest race or caches misbehave.
 */
export async function POST(req: Request) {
  let force = false;
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const body = (await req.json()) as { force?: boolean };
      force = body?.force === true;
    } catch {
      /* empty or invalid body */
    }
  }

  if (!force) {
    const existing = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (existing) {
      const auth = verifyAuthToken(existing);
      if (auth?.userId) {
        const stillThere = await isUserIdInDatabase(auth.userId);
        if (stillThere) {
          return NextResponse.json({ ok: true, skipped: true });
        }
        /* JWT still verifies but user row is gone (e.g. prisma migrate reset) — issue guest. */
      }
    }
  }

  const row = await prisma.userCredential.findUnique({
    where: { username: 'guest' },
    select: { userId: true }
  });

  if (!row) {
    return NextResponse.json(
      { error: 'Guest user not found — run: npx prisma migrate deploy' },
      { status: 503 }
    );
  }

  const token = signAuthToken(row.userId);
  const res = NextResponse.json({ ok: true, skipped: false });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  });
  return res;
}
