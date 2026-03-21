import Link from 'next/link';

/** Shown on the home (my posts) view when using the auto guest session. */
export default function FeedAuthBar() {
  return (
    <div className="feed-auth-bar" role="region" aria-label="Sign in or register">
      <span className="feed-auth-bar__text">
        Use your own account to post, like, and comment under your name.
      </span>
      <div className="feed-auth-bar__actions">
        <Link href="/login" className="feed-auth-bar__btn feed-auth-bar__btn--secondary">
          Sign in
        </Link>
        <Link href="/login?register=1" className="feed-auth-bar__btn feed-auth-bar__btn--primary">
          Register
        </Link>
      </div>
    </div>
  );
}
