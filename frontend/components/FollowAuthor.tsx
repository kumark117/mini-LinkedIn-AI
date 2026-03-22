'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { broadcastFeedRefresh } from '@/lib/feedBroadcast';

export default function FollowAuthor({
  targetUserId,
  targetUsername,
  initiallyFollowing,
  viewerUserId,
  isGuestUser,
  compact,
  showUsernameLink = true
}: {
  targetUserId: number;
  targetUsername: string;
  initiallyFollowing: boolean;
  viewerUserId: number | null;
  isGuestUser: boolean;
  /** Smaller control for inline post cards */
  compact?: boolean;
  /** Set false on public profile header when @name is already shown in the title */
  showUsernameLink?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFollowing(initiallyFollowing);
  }, [initiallyFollowing, targetUserId]);

  if (!viewerUserId || isGuestUser || targetUserId === viewerUserId) {
    return null;
  }

  const toggle = () => {
    void (async () => {
      setBusy(true);
      try {
        const res = await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ username: targetUsername, follow: !following })
        });
        if (!res.ok) return;
        setFollowing(!following);
        router.refresh();
        broadcastFeedRefresh('session');
      } finally {
        setBusy(false);
      }
    })();
  };

  const cls = compact ? 'li-follow-btn li-follow-btn--compact' : 'li-follow-btn';

  return (
    <span className="li-follow-wrap">
      {showUsernameLink ? (
        <Link href={`/user/${encodeURIComponent(targetUsername)}`} className="li-follow-profile-link">
          @{targetUsername}
        </Link>
      ) : null}
      <button type="button" className={cls} disabled={busy} onClick={() => toggle()}>
        {busy ? '…' : following ? 'Unfollow' : 'Follow'}
      </button>
    </span>
  );
}
