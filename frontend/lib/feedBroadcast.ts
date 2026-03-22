/**
 * Notify other browser tabs that the feed/session changed so they call router.refresh().
 * Same-origin tabs share one auth cookie; without this, Discover can stay stale while My Posts updates.
 */
const CHANNEL = 'mini-linkedin-feed';

export type FeedBroadcastReason = 'post' | 'session';

export function broadcastFeedRefresh(reason: FeedBroadcastReason = 'post') {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: 'refresh', reason } as const);
    bc.close();
  } catch {
    /* ignore */
  }
}
