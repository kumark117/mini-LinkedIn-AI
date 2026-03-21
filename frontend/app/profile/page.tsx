import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;

  if (!auth?.userId) redirect('/login');

  const [user, followersCount, followingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        headline: true,
        credentials: { select: { username: true } }
      }
    }),
    prisma.follow.count({ where: { followingId: auth.userId } }),
    prisma.follow.count({ where: { followerId: auth.userId } })
  ]);

  if (!user) redirect('/login');

  const username = user.credentials?.username ?? null;
  const displayName = user.name?.trim() || username || 'Member';
  const displayHeadline = user.headline?.trim() || 'No headline yet.';

  return (
    <main className="app-main app-main-feed">
      <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
        <Link href="/" prefetch={false}>
          ← Home
        </Link>
        {' · '}
        <Link href="/feed/following" prefetch={false}>
          Following
        </Link>
        {' · '}
        <Link href="/feed" prefetch={false}>
          Discover
        </Link>
        {' · '}
        <Link href="/myposts" prefetch={false}>
          My posts
        </Link>
      </p>
      <h1 style={{ margin: '0 0 8px', fontSize: 26 }}>Profile</h1>
      <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>
        <strong style={{ fontWeight: 600, color: 'var(--foreground, inherit)' }}>
          {followersCount}
        </strong>{' '}
        {followersCount === 1 ? 'follower' : 'followers'}
        {' · '}
        <strong style={{ fontWeight: 600, color: 'var(--foreground, inherit)' }}>
          {followingCount}
        </strong>{' '}
        following
      </p>

      <div className="app-card" style={{ maxWidth: 480 }}>
        {username ? (
          <div className="profile-username" title="Username">
            @{username}
          </div>
        ) : null}

        <div className="profile-field">
          <div className="profile-label">Display name</div>
          <div className="profile-value">{displayName}</div>
        </div>

        <div className="profile-field" style={{ marginTop: 14 }}>
          <div className="profile-label">Headline</div>
          <div className="profile-value profile-value--muted">{displayHeadline}</div>
        </div>

        <div className="profile-field" style={{ marginTop: 14 }}>
          <div className="profile-label">User ID</div>
          <div className="profile-value profile-value--muted" style={{ fontSize: 13 }}>
            {user.id}
          </div>
        </div>
      </div>
    </main>
  );
}
