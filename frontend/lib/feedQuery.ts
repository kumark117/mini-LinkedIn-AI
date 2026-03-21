import { prisma } from '@/lib/db';

export type MappedFeedPost = {
  id: number;
  user_id: number;
  author_username: string | null;
  i_follow_author: boolean;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  initial_comments: {
    id: number;
    post_id: number;
    user_id: number;
    content: string;
    created_at: string;
  }[];
};

/**
 * Load feed posts for the global feed or “following only” list.
 */
export async function loadFeedPosts(options: {
  viewerId: number | null;
  mode: 'all' | 'following';
}): Promise<{ posts: MappedFeedPost[]; followedIds: number[] }> {
  const { viewerId, mode } = options;

  const followedRows =
    viewerId != null
      ? await prisma.follow.findMany({
          where: { followerId: viewerId },
          select: { followingId: true }
        })
      : [];
  const followedIds = followedRows.map((r) => r.followingId);
  const followedSet = new Set(followedIds);

  const where =
    mode === 'following'
      ? viewerId != null && followedIds.length > 0
        ? { userId: { in: followedIds } }
        : { userId: { in: [] as number[] } }
      : {};

  const posts = await prisma.post.findMany({
    where,
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          likes: true,
          comments: true
        }
      },
      user: {
        select: {
          id: true,
          credentials: { select: { username: true } }
        }
      },
      likes: {
        where: { userId: viewerId ?? -1 },
        select: { id: true }
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          postId: true,
          userId: true,
          content: true,
          createdAt: true
        }
      }
    }
  });

  const mapped: MappedFeedPost[] = posts.map((p) => ({
    id: p.id,
    user_id: p.userId,
    author_username: p.user.credentials?.username ?? null,
    i_follow_author: followedSet.has(p.userId),
    content: p.content,
    created_at: p.createdAt.toISOString(),
    likes_count: p._count.likes,
    comments_count: p._count.comments,
    liked_by_me: Boolean(p.likes.length),
    initial_comments: p.comments.map((c) => ({
      id: c.id,
      post_id: c.postId,
      user_id: c.userId,
      content: c.content,
      created_at: c.createdAt.toISOString()
    }))
  }));

  return { posts: mapped, followedIds };
}

/** Posts on a member’s public profile page. */
export async function loadAuthorProfilePosts(options: {
  viewerId: number | null;
  authorUserId: number;
  authorUsername: string;
}): Promise<{ posts: MappedFeedPost[]; followedIds: number[] }> {
  const { viewerId, authorUserId, authorUsername } = options;

  const followedRows =
    viewerId != null
      ? await prisma.follow.findMany({
          where: { followerId: viewerId },
          select: { followingId: true }
        })
      : [];
  const followedIds = followedRows.map((r) => r.followingId);
  const followedSet = new Set(followedIds);

  const posts = await prisma.post.findMany({
    where: { userId: authorUserId },
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          likes: true,
          comments: true
        }
      },
      user: {
        select: {
          id: true,
          credentials: { select: { username: true } }
        }
      },
      likes: {
        where: { userId: viewerId ?? -1 },
        select: { id: true }
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          postId: true,
          userId: true,
          content: true,
          createdAt: true
        }
      }
    }
  });

  const mapped: MappedFeedPost[] = posts.map((p) => ({
    id: p.id,
    user_id: p.userId,
    author_username: p.user.credentials?.username ?? authorUsername,
    i_follow_author: followedSet.has(authorUserId),
    content: p.content,
    created_at: p.createdAt.toISOString(),
    likes_count: p._count.likes,
    comments_count: p._count.comments,
    liked_by_me: Boolean(p.likes.length),
    initial_comments: p.comments.map((c) => ({
      id: c.id,
      post_id: c.postId,
      user_id: c.userId,
      content: c.content,
      created_at: c.createdAt.toISOString()
    }))
  }));

  return { posts: mapped, followedIds };
}
