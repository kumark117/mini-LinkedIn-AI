import CreatePost from '@/components/CreatePost';
import SseLiveFeed from '@/components/SseLiveFeed';
import { prisma } from '@/lib/db';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import WsCommentsProvider from '@/components/WsCommentsProvider';
import SummarizeMyFeed from '@/components/SummarizeMyFeed';
import FeedAuthBar from '@/components/FeedAuthBar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Everyone’s posts — like, comment, and see others’ activity (contrast with `/myposts`). */
export default async function FeedPage() {
  noStore();
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const myUserId = auth?.userId;
  const isAuthenticated = Boolean(auth?.userId);

  let mappedPosts: {
    id: number;
    user_id: number;
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
  }[] = [];

  let dbError: string | null = null;
  let isGuestUser = false;

  try {
    const posts = await prisma.post.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        likes: {
          where: { userId: myUserId ?? -1 },
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

    mappedPosts = posts.map((p) => ({
      id: p.id,
      user_id: p.userId,
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

    if (auth?.userId) {
      try {
        const cred = await prisma.userCredential.findUnique({
          where: { userId: auth.userId },
          select: { username: true }
        });
        isGuestUser = cred?.username === 'guest';
      } catch {
        /* leave isGuestUser false */
      }
    }
  } catch {
    dbError = 'Could not load posts — check that PostgreSQL is running and DATABASE_URL is correct.';
  }

  const showFeedAuthCta = !dbError && (isGuestUser || !isAuthenticated);

  return (
    <main className="app-main app-main-feed">
      <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
        <Link href="/myposts" prefetch={false}>
          ← My posts
        </Link>
      </p>
      <h1>My feed</h1>
      <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>
        Posts from everyone — like and comment here. Your own drafts live under My posts.
      </p>
      {showFeedAuthCta ? <FeedAuthBar /> : null}
      {dbError ? (
        <div
          className="app-card"
          style={{ marginTop: 16, borderColor: '#b91c1c', background: '#fef2f2' }}
          role="alert"
        >
          <p style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>{dbError}</p>
          <p style={{ marginTop: 10, marginBottom: 0 }} className="muted">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      ) : (
        <WsCommentsProvider
          key={`u${myUserId ?? 'anon'}`}
          initialByPostId={Object.fromEntries(
            mappedPosts
              .filter((p) => p.initial_comments.length > 0)
              .map((p) => [p.id, p.initial_comments] as const)
          )}
        >
          <SummarizeMyFeed />
          <div style={{ marginTop: 8 }}>
            <CreatePost isAuthenticated={isAuthenticated} />
          </div>
          <div style={{ marginTop: 8 }}>
            <SseLiveFeed
              viewerId={myUserId ?? null}
              initialPosts={mappedPosts}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </WsCommentsProvider>
      )}
    </main>
  );
}
