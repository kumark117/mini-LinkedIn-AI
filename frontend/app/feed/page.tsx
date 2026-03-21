import CreatePost from '@/components/CreatePost';
import SseLiveFeed from '@/components/SseLiveFeed';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import WsCommentsProvider from '@/components/WsCommentsProvider';
import SummarizeMyFeed from '@/components/SummarizeMyFeed';
import FeedAuthBar from '@/components/FeedAuthBar';
import Link from 'next/link';
import { loadFeedPosts } from '@/lib/feedQuery';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Discover = full network (not the same as Following). */
export default async function FeedPage() {
  noStore();
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const myUserId = auth?.userId;
  const isAuthenticated = Boolean(auth?.userId);

  let mappedPosts: Awaited<ReturnType<typeof loadFeedPosts>>['posts'] = [];
  let followedIds: number[] = [];
  let dbError: string | null = null;
  let isGuestUser = false;

  try {
    const r = await loadFeedPosts({ viewerId: myUserId ?? null, mode: 'all' });
    mappedPosts = r.posts;
    followedIds = r.followedIds;

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
        <Link href="/feed/following" prefetch={false}>
          ← Following
        </Link>
        {' · '}
        <Link href="/myposts" prefetch={false}>
          My posts
        </Link>
      </p>
      <h1>Discover</h1>
      <div className="feed-mode-explainer" role="note">
        <strong>Everyone’s posts</strong> — not filtered by who you follow. You’ll see new authors here first;
        that’s normal. Use <strong>Follow</strong> next to an @name when you want them in your{' '}
        <Link href="/feed/following">Following</Link> stream only.
      </div>
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
              followedUserIds={followedIds}
              isGuestUser={isGuestUser}
              enableHeartBeatFilter
            />
          </div>
        </WsCommentsProvider>
      )}
    </main>
  );
}
