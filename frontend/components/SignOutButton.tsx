'use client';

import { useState } from 'react';

/**
 * Clears the current account and forces a fresh guest session, then hard-navigates so the
 * shell (nav pill, Sign out vs Sign in) cannot stay stuck on stale RSC/cache.
 */
export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="app-nav-auth-btn app-nav-auth-btn--outline"
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            const out = await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'same-origin'
            });
            if (!out.ok) {
              // eslint-disable-next-line no-alert
              alert('Sign out failed — try again.');
              return;
            }
            const guest = await fetch('/api/auth/guest', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ force: true })
            });
            if (!guest.ok) {
              // eslint-disable-next-line no-alert
              alert('Could not restore guest session — refresh the page.');
              return;
            }
            // Hard navigation + cache-bust so AppNav re-renders guest (Sign in / Register, no Sign out).
            const next = new URL('/myposts', window.location.origin);
            next.searchParams.set('_nav', String(Date.now()));
            window.location.replace(next.toString());
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
