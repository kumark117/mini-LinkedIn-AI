import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export const AUTH_COOKIE_NAME = 'auth_token';

type AuthPayload = {
  userId: number;
  iat?: number;
  exp?: number;
};

export function signAuthToken(userId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');

  return jwt.sign({ userId } satisfies AuthPayload, secret, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    return jwt.verify(token, secret) as AuthPayload;
  } catch {
    return null;
  }
}

export function getTokenFromCookieHeader(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = parse(cookieHeader);
  const token = cookies[AUTH_COOKIE_NAME];
  return typeof token === 'string' ? token : undefined;
}

