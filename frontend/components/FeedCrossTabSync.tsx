'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const CHANNEL = 'mini-linkedin-feed';

/**
 * Listens for feed/session updates from other tabs (see feedBroadcast.ts) and refreshes RSC data.
 */
export default function FeedCrossTabSync() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        router.refresh();
      }, 200);
    };

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      bc.close();
    };
  }, [router]);

  return null;
}
