import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { broadcastNewPost } from '@/lib/sse';

export const runtime = 'nodejs';

const CreatePostSchema = z.object({
  content: z.string().min(1).max(5000)
});

const LikePostSchema = z.object({
  action: z.literal('like'),
  post_id: z.number().int().positive()
});

export async function GET() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const myUserId = auth?.userId ?? null;

  const posts = await prisma.post.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { likes: true, comments: true } },
      likes: {
        where: { userId: myUserId ?? -1 },
        select: { id: true }
      }
    }
  });

  const mappedPosts = posts.map((p) => ({
    id: p.id,
    user_id: p.userId,
    content: p.content,
    created_at: p.createdAt.toISOString(),
    likes_count: p._count.likes,
    comments_count: p._count.comments,
    liked_by_me: Boolean(p.likes.length)
  }));

  return NextResponse.json({ posts: mappedPosts });
}

export async function POST(req: Request) {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  if (!auth?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const likeParsed = LikePostSchema.safeParse(body);
  if (likeParsed.success) {
    const { post_id } = likeParsed.data;
    const existing = await prisma.like.findFirst({
      where: { userId: auth.userId, postId: post_id },
      select: { id: true }
    });

    const nextLiked = !existing;
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({
        data: { userId: auth.userId, postId: post_id }
      });
    }

    const likes_count = await prisma.like.count({ where: { postId: post_id } });

    return NextResponse.json({
      ok: true,
      post_id,
      likes_count,
      liked_by_me: nextLiked
    });
  }

  const createParsed = CreatePostSchema.safeParse(body);
  if (!createParsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { content } = createParsed.data;
  const created = await prisma.post.create({
    data: { userId: auth.userId, content }
  });

  const postEvent = {
    id: created.id,
    user_id: created.userId,
    content: created.content,
    created_at: created.createdAt.toISOString()
  };

  // SSE will be implemented in `nextjs-sse`; kept as a stub call for now.
  broadcastNewPost(postEvent);

  return NextResponse.json({ ok: true, post: postEvent });
}

