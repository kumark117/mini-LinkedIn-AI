'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * First visit: obtain default `guest` session so posting and other actions work without manual login.
 * Skipped when a valid auth cookie already exists (see /api/auth/guest).
 */
export default function GuestBootstrap() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        const res = await fetch('/api/auth/guest', { method: 'POST', credentials: 'same-origin' });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { skipped?: boolean };
        if (!data.skipped) {
          router.refresh();
        }
      } catch {
        /* offline / blocked — ignore */
      }
    })();
  }, [router]);

  return null;
}
