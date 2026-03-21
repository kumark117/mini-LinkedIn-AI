import CreatePost from '@/components/CreatePost';
import SseLiveFeed from '@/components/SseLiveFeed';
import FollowAuthor from '@/components/FollowAuthor';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import WsCommentsProvider from '@/components/WsCommentsProvider';
import FeedAuthBar from '@/components/FeedAuthBar';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { loadAuthorProfilePosts } from '@/lib/feedQuery';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PublicUserPage({ params }: { params: { username: string } }) {
  noStore();
  const raw = params.username ?? '';
  const username = decodeURIComponent(raw.trim());
  if (username.length < 3) notFound();

  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const myUserId = auth?.userId ?? null;
  const isAuthenticated = Boolean(auth?.userId);

  const cred = await prisma.userCredential.findUnique({
    where: { username },
    include: {
      user: { select: { id: true, name: true, headline: true } }
    }
  });

  if (!cred) notFound();

  const profileUserId = cred.userId;
  const displayName = cred.user.name?.trim() || username;

  let isGuestUser = false;
  if (auth?.userId) {
    const mine = await prisma.userCredential.findUnique({
      where: { userId: auth.userId },
      select: { username: true }
    });
    isGuestUser = mine?.username === 'guest';
  }

  let mappedPosts: Awaited<ReturnType<typeof loadAuthorProfilePosts>>['posts'] = [];
  let followedIds: number[] = [];
  let dbError: string | null = null;

  try {
    const r = await loadAuthorProfilePosts({
      viewerId: myUserId,
      authorUserId: profileUserId,
      authorUsername: username
    });
    mappedPosts = r.posts;
    followedIds = r.followedIds;
  } catch {
    dbError = 'Could not load posts.';
  }

  const isSelf = myUserId === profileUserId;
  const iFollow = followedIds.includes(profileUserId);

  return (
    <main className="app-main app-main-feed">
      <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
        <Link href="/feed/following" prefetch={false}>
          ← Following
        </Link>
        {' · '}
        <Link href="/feed" prefetch={false}>
          Discover
        </Link>
      </p>

      <div className="app-card" style={{ marginBottom: 16, maxWidth: 520 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>@{username}</h1>
        <p style={{ margin: 0, fontWeight: 600 }}>{displayName}</p>
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
          {cred.user.headline?.trim() || 'No headline.'}
        </p>
        {!isSelf && isAuthenticated && !isGuestUser ? (
          <div style={{ marginTop: 14 }}>
            <FollowAuthor
              targetUserId={profileUserId}
              targetUsername={username}
              initiallyFollowing={iFollow}
              viewerUserId={myUserId}
              isGuestUser={isGuestUser}
              showUsernameLink={false}
            />
          </div>
        ) : null}
        {isSelf ? (
          <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 14 }}>
            This is you — <Link href="/profile">Profile</Link> · <Link href="/myposts">My posts</Link>
          </p>
        ) : null}
        {isGuestUser ? <FeedAuthBar /> : null}
      </div>

      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Posts</h2>

      {dbError ? (
        <div className="app-card" role="alert" style={{ borderColor: '#b91c1c' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>{dbError}</p>
        </div>
      ) : (
        <WsCommentsProvider
          key={`user-${username}-v${myUserId ?? 'anon'}`}
          initialByPostId={Object.fromEntries(
            mappedPosts
              .filter((p) => p.initial_comments.length > 0)
              .map((p) => [p.id, p.initial_comments] as const)
          )}
        >
          {isSelf ? (
            <div style={{ marginBottom: 8 }}>
              <CreatePost isAuthenticated={isAuthenticated} />
            </div>
          ) : null}
          <SseLiveFeed
            viewerId={myUserId}
            initialPosts={mappedPosts}
            isAuthenticated={isAuthenticated}
            sseOnlyUserIds={[profileUserId]}
            followedUserIds={followedIds}
            isGuestUser={isGuestUser}
          />
        </WsCommentsProvider>
      )}
    </main>
  );
}
