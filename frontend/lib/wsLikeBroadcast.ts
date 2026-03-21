export type FeedLikePayload = { event: 'like'; postId: number; likes_count: number };

type Broadcaster = (payload: FeedLikePayload) => void;

let broadcast: Broadcaster | null = null;

/** Called once from `server.ts` when the comments WebSocket server is created. */
export function registerLikeBroadcaster(fn: Broadcaster) {
  broadcast = fn;
}

/** Notify all browser tabs (including the post author on My posts) when someone likes/unlikes. */
export function broadcastLikeUpdate(postId: number, likes_count: number) {
  try {
    broadcast?.({ event: 'like', postId, likes_count });
  } catch {
    /* ignore */
  }
}
