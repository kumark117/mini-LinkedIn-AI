'use client';

import { useLayoutEffect } from 'react';

/**
 * Loads /fallback.css from `public/` in a separate request so styles still apply
 * if bundled `/_next/static/css/...` fails (custom server / hostname issues).
 */
export default function FallbackStylesheet() {
  useLayoutEffect(() => {
    if (document.querySelector('link[href="/fallback.css"]')) return;
    const id = 'public-fallback-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = '/fallback.css';
    document.head.appendChild(link);
  }, []);

  return null;
}
