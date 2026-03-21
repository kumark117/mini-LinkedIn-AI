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
import EnsureGuestSession from '@/components/EnsureGuestSession';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyPostsPage() {
  noStore();
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const myUserId = auth?.userId;

  if (!myUserId) {
    return <EnsureGuestSession />;
  }

  const isAuthenticated = true;

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
      where: { userId: myUserId },
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
          where: { userId: myUserId },
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

    try {
      const cred = await prisma.userCredential.findUnique({
        where: { userId: myUserId },
        select: { username: true }
      });
      isGuestUser = cred?.username === 'guest';
    } catch {
      /* leave isGuestUser false */
    }
  } catch {
    dbError = 'Could not load posts — check that PostgreSQL is running and DATABASE_URL is correct.';
  }

  const showFeedAuthCta = !dbError && isGuestUser;

  return (
    <main className="app-main app-main-feed">
      <h1>My posts</h1>
      <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>
        Only posts you authored — each account sees its own list.
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
          key={`myposts-u${myUserId}`}
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
              viewerId={myUserId}
              initialPosts={mappedPosts}
              isAuthenticated={isAuthenticated}
              onlyAuthorUserId={myUserId}
            />
          </div>
        </WsCommentsProvider>
      )}
    </main>
  );
}
