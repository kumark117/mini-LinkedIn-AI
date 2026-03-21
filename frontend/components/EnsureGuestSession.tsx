'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * First visit has no auth cookie yet (guest is issued client-side). Without this, SSR would
 * send users to /login before GuestBootstrap runs. We obtain guest here then refresh RSC.
 */
export default function EnsureGuestSession() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/guest', { method: 'POST', credentials: 'same-origin' });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(typeof data?.error === 'string' ? data.error : 'Could not start session');
          return;
        }
        router.refresh();
      } catch {
        if (!cancelled) setError('Could not start session');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <main className="app-main app-main-feed">
        <div className="app-card" style={{ borderColor: '#b91c1c', background: '#fef2f2' }} role="alert">
          <p style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>{error}</p>
          <p style={{ marginTop: 10, marginBottom: 0 }} className="muted">
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main app-main-feed">
      <p className="muted">Starting session…</p>
    </main>
  );
}
