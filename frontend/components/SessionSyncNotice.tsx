'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mini-linkedin-last-auth-user-id';

/**
 * One browser = one auth cookie. Another tab signing in replaces the session; this notices
 * when /api/auth/me returns a different user id and nudges the user + refreshes the shell.
 */
export default function SessionSyncNotice() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        if (!r.ok) {
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
          return;
        }
        const d = (await r.json()) as { user?: { id?: number; username?: string | null } };
        const id = d?.user?.id;
        const username = d?.user?.username;
        if (typeof id !== 'number') return;

        let prev: string | null = null;
        try {
          prev = sessionStorage.getItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }

        try {
          sessionStorage.setItem(STORAGE_KEY, String(id));
        } catch {
          /* ignore */
        }

        if (prev != null && prev !== String(id) && username != null) {
          setMessage(
            `This tab’s session changed — you’re signed in as @${username} (only one account per browser).`
          );
          router.refresh();
        }
      } catch {
        /* ignore */
      }
    };

    void sync();
    const onVis = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVis);
    const interval = window.setInterval(() => void sync(), 45_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(interval);
    };
  }, [router]);

  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        margin: '0 12px 10px',
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.45,
        color: '#1e3a8a',
        background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 70%)',
        border: '1px solid rgba(30, 64, 175, 0.35)',
        borderRadius: 8
      }}
    >
      <strong style={{ display: 'block', marginBottom: 4 }}>Session update</strong>
      {message}{' '}
      <button
        type="button"
        onClick={() => setMessage(null)}
        style={{
          marginLeft: 8,
          padding: '2px 8px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          borderRadius: 6,
          border: '1px solid rgba(30, 64, 175, 0.4)',
          background: '#fff'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
