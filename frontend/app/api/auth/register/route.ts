import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { signAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { zodErrorMessage } from '@/lib/zodErrorMessage';
import { isReservedDemoUsername } from '@/lib/demoAccounts';
import { PASSWORD_MAX, USERNAME_MAX, USERNAME_MIN } from '@/lib/authLimits';

export const runtime = 'nodejs';

const RegisterBodySchema = z.object({
  name: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === 'string' ? v.trim().slice(0, 100) : '')),
  headline: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === 'string' ? v.trim().slice(0, 200) : '')),
  username: z.string().trim().min(USERNAME_MIN).max(USERNAME_MAX),
  password: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === 'string' ? v : ''))
    .pipe(z.string().max(PASSWORD_MAX)),
  /** Default true: set session cookie so the user lands logged in as this account. */
  signInAfterRegister: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === 'boolean') return v;
      return v === 'true';
    })
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RegisterBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const { name: nameRaw, headline, username, password, signInAfterRegister } = parsed.data;
  /** Explicit false only skips cookie; undefined defaults to sign-in (matches checkbox default on). */
  const signIn = signInAfterRegister !== false;
  const name = nameRaw ? nameRaw : username;

  if (isReservedDemoUsername(username)) {
    return NextResponse.json(
      {
        error:
          'That username is reserved (demo1–demo9, or legacy dem1–dem9). Use Login with an empty password instead of registering.'
      },
      { status: 409 }
    );
  }

  if (!process.env.JWT_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'Server misconfiguration: set JWT_SECRET in .env' },
      { status: 500 }
    );
  }

  let passwordHash: string | null;
  try {
    passwordHash = password.length === 0 ? null : await bcrypt.hash(password, 10);
  } catch {
    return NextResponse.json({ error: 'Could not process password.' }, { status: 400 });
  }

  try {
    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, headline } });
      await tx.userCredential.create({
        data: {
          userId: user.id,
          username,
          passwordHash
        }
      });
      return user;
    });

    const res = NextResponse.json(
      {
        signedIn: signIn,
        user: {
          id: createdUser.id,
          name: createdUser.name,
          headline: createdUser.headline,
          username
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    if (signIn) {
      const token = signAuthToken(createdUser.id);
      res.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    return res;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        const target = err.meta?.target;
        const fields = Array.isArray(target) ? target : target != null ? [target] : [];
        const taken =
          fields.some((f) => String(f).includes('username')) || fields.length === 0;
        return NextResponse.json(
          { error: taken ? 'That username is already taken.' : 'Registration conflict — try another username.' },
          { status: 409 }
        );
      }
      if (err.code === 'P1000' || err.code === 'P1001' || err.code === 'P1017') {
        return NextResponse.json(
          {
            error:
              'Cannot reach PostgreSQL. Start the database and check DATABASE_URL in frontend/.env (user, password, database name).'
          },
          { status: 503 }
        );
      }
      if (err.code === 'P2011') {
        return NextResponse.json(
          {
            error:
              'Database needs migration: password_hash must allow NULL for empty passwords. From frontend folder run: npx prisma migrate deploy'
          },
          { status: 503 }
        );
      }
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error:
            'Database connection failed. Confirm PostgreSQL is running and DATABASE_URL matches your DB user/password.'
        },
        { status: 503 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('JWT_SECRET')) {
      return NextResponse.json({ error: 'Server misconfiguration: set JWT_SECRET in .env' }, { status: 500 });
    }

    // eslint-disable-next-line no-console
    console.error('[register]', err);

    const devHint =
      process.env.NODE_ENV === 'development'
        ? ` (${message.slice(0, 120)}${message.length > 120 ? '…' : ''})`
        : '';
    return NextResponse.json({ error: `Registration failed.${devHint}` }, { status: 500 });
  }
}

