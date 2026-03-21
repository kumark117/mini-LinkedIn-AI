import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { zodErrorMessage } from '@/lib/zodErrorMessage';
import { PASSWORD_MAX, USERNAME_MAX, USERNAME_MIN } from '@/lib/authLimits';

export const runtime = 'nodejs';

const LoginBodySchema = z.object({
  username: z.string().trim().min(USERNAME_MIN).max(USERNAME_MAX),
  // Empty password allowed for demo accounts (NULL password_hash in DB).
  password: z.string().max(PASSWORD_MAX)
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LoginBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const { username, password } = parsed.data;

  const credential = await prisma.userCredential.findUnique({
    where: { username },
    select: { userId: true, passwordHash: true, username: true }
  });

  if (!credential) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok =
    credential.passwordHash == null
      ? password === ''
      : await bcrypt.compare(password, credential.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signAuthToken(credential.userId);
  const user = await prisma.user.findUnique({
    where: { id: credential.userId },
    select: { id: true, name: true, headline: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({
    user: {
      ...user,
      username: credential.username
    }
  });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  });

  return res;
}

