import { NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
import crypto from 'crypto';

export const runtime = 'nodejs';

function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const x = Buffer.from(a, 'utf8');
    const y = Buffer.from(b, 'utf8');
    if (x.length !== y.length) return false;
    return crypto.timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

/**
 * Purges the database and reapplies all Prisma migrations (demo / local only).
 * Requires ALLOW_DB_RESET=true and DB_RESET_PASSWORD; client must POST the same password.
 */
export async function POST(req: Request) {
  if (process.env.ALLOW_DB_RESET !== 'true') {
    return NextResponse.json(
      { error: 'Database reset is disabled. Set ALLOW_DB_RESET=true in .env to enable.' },
      { status: 403 }
    );
  }

  const expected = (process.env.DB_RESET_PASSWORD ?? '').trim();
  if (!expected) {
    return NextResponse.json(
      { error: 'DB_RESET_PASSWORD is not set in the environment.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!timingSafeEqualString(password, expected)) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  const cwd = process.cwd();
  const result = spawnSync('npx', ['prisma', 'migrate', 'reset', '--force'], {
    cwd,
    shell: true,
    encoding: 'utf-8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });

  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';

  if (result.status !== 0) {
    return NextResponse.json(
      {
        error: 'prisma migrate reset failed',
        stdout: stdout.slice(0, 8000),
        stderr: stderr.slice(0, 8000)
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Database reset complete; all migrations were applied.',
    output: stdout.slice(0, 6000)
  });
}
