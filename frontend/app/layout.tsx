import type { Metadata } from 'next';
import AppNav from '@/components/AppNav';
import FallbackStylesheet from '@/components/FallbackStylesheet';
import GuestBootstrap from '@/components/GuestBootstrap';
import FeedCrossTabSync from '@/components/FeedCrossTabSync';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini-LinkedIn AI',
  description: 'Minimal LinkedIn-like demo with SSR + SSE + WebSockets + AI'
};

/** Nav reads cookies + DB; must not serve a cached shell after login / sign-out. */
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fallback.css" />
      </head>
      <body>
        <FallbackStylesheet />
        <GuestBootstrap />
        <FeedCrossTabSync />
        <AppNav />
        {children}
      </body>
    </html>
  );
}
