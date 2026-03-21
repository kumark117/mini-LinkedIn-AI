import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import ServerClock from '@/components/ServerClock';
import SignOutButton from '@/components/SignOutButton';
import NavAuthButtons from '@/components/NavAuthButtons';

export default async function AppNav() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? verifyAuthToken(token) : null;
  const showDbReset = process.env.ALLOW_DB_RESET === 'true';

  let username: string | null = null;
  if (auth?.userId) {
    try {
      const cred = await prisma.userCredential.findUnique({
        where: { userId: auth.userId },
        select: { username: true }
      });
      username = cred?.username ?? null;
    } catch {
      /* ignore */
    }
  }

  /* Require DB-backed username so stale JWTs after reset don’t look “logged in” until guest re-issues. */
  const loggedIn = Boolean(username);
  const isGuestUser = username === 'guest';

  return (
    <nav className="app-nav" aria-label="Main">
      <div className="app-nav-left">
        <Link href="/" prefetch={false} className="app-nav-brand">
          Mini-LinkedIn AI
        </Link>
        {loggedIn && username ? (
          <span className="app-nav-user-pill" title="Signed in">
            @{username}
          </span>
        ) : null}
      </div>
      <div className="app-nav-links">
        <ServerClock />
        {showDbReset ? (
          <Link href="/admin/reset-db" title="Purge DB and re-run migrations">
            Database · Reset
          </Link>
        ) : null}
        {loggedIn ? (
          <>
            {isGuestUser ? (
              <span className="app-nav-guest-row">
                <NavAuthButtons />
                <span className="app-nav-guest-hint muted" title="Guest is a built-in demo session">
                  Guest — no sign-out needed. Sign in for your account or register.
                </span>
              </span>
            ) : null}
            <Link href="/feed/following" prefetch={false} title="Posts only from people you follow">
              Following
            </Link>
            <Link href="/feed" prefetch={false} title="All members’ posts — find people to follow">
              Discover
            </Link>
            <Link href="/myposts" prefetch={false}>
              My posts
            </Link>
            <Link href="/profile" prefetch={false}>
              Profile
            </Link>
            {username && !isGuestUser ? <SignOutButton /> : null}
          </>
        ) : (
          <NavAuthButtons />
        )}
      </div>
    </nav>
  );
}
