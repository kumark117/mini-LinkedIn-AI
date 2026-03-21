import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';

export const runtime = 'nodejs';

const BodySchema = z.object({
  username: z.string().trim().min(1).max(80),
  follow: z.boolean()
});

/** List users the current viewer follows (ids + usernames). */
export async function GET() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  if (!auth?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.follow.findMany({
    where: { followerId: auth.userId },
    select: {
      followingId: true,
      following: {
        select: {
          credentials: { select: { username: true } }
        }
      }
    }
  });

  const following = rows
    .map((r) => ({
      id: r.followingId,
      username: r.following.credentials?.username ?? null
    }))
    .filter((x): x is { id: number; username: string } => x.username != null);

  return NextResponse.json({ following });
}

/** Follow or unfollow by target username. */
export async function POST(req: Request) {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  if (!auth?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { username, follow } = parsed.data;

  const target = await prisma.userCredential.findUnique({
    where: { username },
    select: { userId: true }
  });

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.userId === auth.userId) {
    return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
  }

  if (follow) {
    await prisma.follow.createMany({
      data: [{ followerId: auth.userId, followingId: target.userId }],
      skipDuplicates: true
    });
  } else {
    await prisma.follow.deleteMany({
      where: {
        followerId: auth.userId,
        followingId: target.userId
      }
    });
  }

  return NextResponse.json({ ok: true, follow, userId: target.userId, username });
}
