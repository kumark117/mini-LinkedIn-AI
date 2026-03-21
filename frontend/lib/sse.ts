export type SsePostEvent = {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  /** Lets the client render @author + Follow without an extra fetch. */
  author_username?: string | null;
};

/** Fan-out to FastAPI SSE hub (optional; requires FASTAPI_BASE_URL). */
async function notifyFastApiSseClients(post: SsePostEvent): Promise<void> {
  const raw = process.env.FASTAPI_BASE_URL?.trim();
  if (!raw) return;
  const base = raw.replace(/\/$/, '');
  const secret = process.env.SSE_BROADCAST_SECRET?.trim();
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['X-Broadcast-Secret'] = secret;
    const res = await fetch(`${base}/internal/broadcast-post`, {
      method: 'POST',
      headers,
      body: JSON.stringify(post)
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('[sse] FastAPI broadcast failed', res.status);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[sse] FastAPI broadcast error', e);
  }
}

type Subscriber = (post: SsePostEvent) => void;

/**
 * Next may load multiple copies of this module across route bundles; a plain module-level Set
 * breaks live updates (POST succeeds but /api/stream never receives subscribers). Use globalThis.
 */
function subscriberSet(): Set<Subscriber> {
  const g = globalThis as typeof globalThis & { __miniLinkedInSseSubs?: Set<Subscriber> };
  if (!g.__miniLinkedInSseSubs) {
    g.__miniLinkedInSseSubs = new Set();
  }
  return g.__miniLinkedInSseSubs;
}

export function subscribeToNewPosts(subscriber: Subscriber): () => void {
  const subscribers = subscriberSet();
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function broadcastNewPost(post: SsePostEvent) {
  const subscribers = subscriberSet();
  for (const subscriber of subscribers) {
    try {
      subscriber(post);
    } catch {
      // Ignore misbehaving subscribers; they will be cleaned up by disconnect.
    }
  }
  void notifyFastApiSseClients(post);
}

