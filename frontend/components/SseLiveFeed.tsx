'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FeedList, { FeedPost } from './FeedList';

type SsePostEvent = {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  author_username?: string | null;
};

type SseNewsEvent = {
  items: { title: string; url: string }[];
  feed_label?: string;
  feed_url?: string;
  /** ISO-8601 UTC from FastAPI when RSS was last fetched (HTTP + SSE). */
  updated_at?: string;
  disabled?: boolean;
  error?: string;
};

function formatNewsAge(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 0) return 'just now';
  if (sec < 8) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Same post can arrive via SSE and again from `router.refresh()` — keep one card per id. */
function dedupePostsById(posts: FeedPost[]): FeedPost[] {
  const seen = new Set<number>();
  const out: FeedPost[] = [];
  for (const p of posts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/**
 * Keep every non-HeartBeat post; among @HeartBeat rows, keep only the newest.
 * (Older bug: hid all human posts when the filter was on.)
 */
function collapseHeartBeatToLatest(posts: FeedPost[]): FeedPost[] {
  const nonHb: FeedPost[] = [];
  const hb: FeedPost[] = [];
  for (const p of posts) {
    if (p.author_username === 'HeartBeat') hb.push(p);
    else nonHb.push(p);
  }
  if (hb.length === 0) return posts;
  const latestHb = hb.reduce((a, b) => (a.created_at >= b.created_at ? a : b));
  return [...nonHb, latestHb].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export default function SseLiveFeed({
  viewerId,
  initialPosts,
  isAuthenticated,
  sseOnlyUserIds,
  followedUserIds,
  isGuestUser,
  enableHeartBeatFilter = false,
  showLiveNewsStrip = false
}: {
  /** When this changes (switch accounts), reset list even if post IDs are unchanged — liked_by_me differs per user. */
  viewerId: number | null;
  initialPosts: FeedPost[];
  isAuthenticated: boolean;
  /**
   * If set, only prepend SSE posts whose `user_id` is in this list.
   * - `[myUserId]` → My posts
   * - `[...followedIds]` → Following feed
   * - `undefined` → everyone’s posts
   */
  sseOnlyUserIds?: number[] | null;
  /** Used to set `i_follow_author` on live posts (Follow button state). */
  followedUserIds?: number[] | null;
  isGuestUser: boolean;
  /** Discover / Following: optional collapse of HeartBeat spam to a single latest line (default on). */
  enableHeartBeatFilter?: boolean;
  /** Discover: show RSS headlines from FastAPI SSE (`event: news`). Requires NEXT_PUBLIC_FASTAPI_SSE_ORIGIN. */
  showLiveNewsStrip?: boolean;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [liveNews, setLiveNews] = useState<SseNewsEvent | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsFetchError, setNewsFetchError] = useState(false);
  /** Brief highlight when SSE pushes a new headline batch (real-time feedback). */
  const [newsJustUpdated, setNewsJustUpdated] = useState(false);
  const [heartBeatOnly, setHeartBeatOnly] = useState(true);
  const seenIds = useRef<Set<number>>(new Set(initialPosts.map((p) => p.id)));
  const followedRef = useRef(followedUserIds);
  followedRef.current = followedUserIds;
  const sseAllowRef = useRef(sseOnlyUserIds);
  sseAllowRef.current = sseOnlyUserIds;

  /** Distinguish feeds (Discover vs profile vs My posts) so we reset when switching /user/a → /user/b even if both have no posts. */
  const feedScopeKey = useMemo(() => {
    if (sseOnlyUserIds == null) return 'all';
    if (sseOnlyUserIds.length === 0) return 'none';
    return sseOnlyUserIds.slice().sort((a, b) => a - b).join(',');
  }, [sseOnlyUserIds]);

  const initialSig = useMemo(
    () => `${initialPosts.map((p) => p.id).join(',')}|${feedScopeKey}`,
    [initialPosts, feedScopeKey]
  );

  // Only sync when the id-list or feed scope changes — not when the parent passes a new array ref with the same ids
  // (avoids resetting `seenIds` while an SSE post is already shown, which could allow a duplicate).
  useEffect(() => {
    setPosts(dedupePostsById(initialPosts));
    seenIds.current = new Set(initialPosts.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialPosts read from render when initialSig/viewerId change
  }, [viewerId, initialSig]);

  const fastApiOrigin = useMemo(() => process.env.NEXT_PUBLIC_FASTAPI_SSE_ORIGIN?.trim() ?? '', []);

  const hasFastApiSse = Boolean(fastApiOrigin);
  const newsStripActive = showLiveNewsStrip && hasFastApiSse;

  /** FastAPI SSE URL — only used for the news strip (`event: news`), not for posts. */
  const fastApiStreamUrl = useMemo(
    () => (fastApiOrigin ? `${fastApiOrigin.replace(/\/$/, '')}/api/stream/posts` : ''),
    [fastApiOrigin]
  );

  /** HTTP snapshot — works even when SSE named events fail cross-origin; SSE still pushes updates. */
  useEffect(() => {
    if (!newsStripActive) return;
    let cancelled = false;
    setNewsLoading(true);
    setNewsFetchError(false);
    fetch('/api/news/demo', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<SseNewsEvent>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.disabled) {
          setLiveNews({ items: [], disabled: true });
          return;
        }
        setLiveNews(data);
        setNewsJustUpdated(false);
      })
      .catch(() => {
        if (!cancelled) setNewsFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [newsStripActive]);

  /** Recompute "Xs ago" label while the strip is visible. */
  const [newsAgeTick, setNewsAgeTick] = useState(0);
  useEffect(() => {
    if (!liveNews?.updated_at) return;
    const id = window.setInterval(() => setNewsAgeTick((n) => n + 1), 12000);
    return () => window.clearInterval(id);
  }, [liveNews?.updated_at]);

  useEffect(() => {
    if (!newsJustUpdated) return;
    const id = window.setTimeout(() => setNewsJustUpdated(false), 1000);
    return () => window.clearTimeout(id);
  }, [newsJustUpdated]);

  /**
   * Posts: always use same-origin `/api/stream` so `broadcastNewPost` in the Next process delivers
   * immediately (no hop to FastAPI). News: optional second connection to FastAPI for `event: news` only.
   */
  useEffect(() => {
    const esPosts = new EventSource('/api/stream');

    const onPost = (ev: MessageEvent) => {
      try {
        const post = JSON.parse(ev.data) as SsePostEvent;
        const allow = sseAllowRef.current;
        if (allow != null) {
          if (allow.length === 0 || !allow.includes(post.user_id)) return;
        }
        if (seenIds.current.has(post.id)) return;
        seenIds.current.add(post.id);

        const followList = followedRef.current ?? [];
        const mapped: FeedPost = {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          created_at: post.created_at,
          likes_count: 0,
          comments_count: 0,
          liked_by_me: false,
          initial_comments: [],
          author_username: post.author_username ?? null,
          i_follow_author: followList.includes(post.user_id)
        };

        setPosts((prev) => dedupePostsById([mapped, ...prev]).slice(0, 30));
      } catch {
        // ignore malformed SSE payloads
      }
    };

    esPosts.addEventListener('post', onPost);

    let esNews: EventSource | null = null;
    const onNews = (ev: MessageEvent) => {
      try {
        setLiveNews(JSON.parse(ev.data) as SseNewsEvent);
        setNewsLoading(false);
        setNewsFetchError(false);
        setNewsJustUpdated(true);
      } catch {
        // ignore malformed SSE payloads
      }
    };

    if (newsStripActive && fastApiStreamUrl) {
      esNews = new EventSource(fastApiStreamUrl);
      esNews.addEventListener('news', onNews);
    }

    return () => {
      esPosts.removeEventListener('post', onPost);
      esPosts.close();
      if (esNews) {
        esNews.removeEventListener('news', onNews);
        esNews.close();
      }
    };
  }, [viewerId, newsStripActive, fastApiStreamUrl]);

  const displayPosts = useMemo(() => {
    if (!enableHeartBeatFilter || !heartBeatOnly) return posts;
    return collapseHeartBeatToLatest(posts);
  }, [posts, enableHeartBeatFilter, heartBeatOnly]);

  const newsSection =
    newsStripActive ? (
      <section
        className={`li-live-news li-live-news--sidebar${newsJustUpdated ? ' li-live-news--fresh' : ''}`}
        aria-label="Live headlines demo"
        data-news-age-tick={newsAgeTick}
      >
        <div className="li-live-news__bar">
          <span className="li-live-news__title">
            <span className="li-live-news__dot" aria-hidden />
            Live headlines
          </span>
          <span className="li-live-news__meta">
            {liveNews?.feed_label ?? 'RSS via FastAPI'}
            {liveNews?.updated_at ? (
              <>
                {' '}
                <span className="muted" title={liveNews.updated_at}>
                  · {formatNewsAge(liveNews.updated_at)}
                </span>
              </>
            ) : null}
            {newsJustUpdated ? (
              <span className="li-live-news__sse-badge" title="New batch from SSE">
                SSE
              </span>
            ) : null}
          </span>
        </div>
        {liveNews?.disabled ? (
          <p className="li-live-news__waiting muted">RSS demo is off on FastAPI (set NEWS_DEMO_ENABLED).</p>
        ) : newsFetchError && !liveNews ? (
          <p className="li-live-news__waiting muted" role="alert">
            Couldn’t load headlines — start FastAPI on port 8000. If it still fails, set{' '}
            <code className="li-inline-code">FASTAPI_BASE_URL=http://127.0.0.1:8000</code> in{' '}
            <code className="li-inline-code">frontend/.env</code> and restart <code className="li-inline-code">npm run dev</code>.
          </p>
        ) : newsLoading && !liveNews ? (
          <p className="li-live-news__waiting muted">Pulling the latest items…</p>
        ) : liveNews?.error === 'fetch_failed' || (liveNews && liveNews.items.length === 0 && !liveNews.disabled) ? (
          <p className="li-live-news__waiting muted">No items in this feed right now.</p>
        ) : liveNews && liveNews.items.length > 0 ? (
          <div className="li-live-news__track">
            {liveNews.items.map((it) => (
              <a
                key={it.url}
                className="li-live-news__chip"
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {it.title}
              </a>
            ))}
          </div>
        ) : (
          <p className="li-live-news__waiting muted">Pulling the latest items…</p>
        )}
      </section>
    ) : null;

  return (
    <div
      className={
        newsStripActive
          ? 'li-feed-discovery-layout li-feed-discovery-layout--split'
          : 'li-feed-discovery-layout'
      }
    >
      <div className="li-feed-discovery-layout__main">
        {enableHeartBeatFilter ? (
          <label className="heartbeat-feed-toggle">
            <input
              type="checkbox"
              checked={heartBeatOnly}
              onChange={(e) => setHeartBeatOnly(e.target.checked)}
            />
            Collapse HeartBeat · latest only
          </label>
        ) : null}
        <FeedList
          posts={displayPosts}
          isAuthenticated={isAuthenticated}
          viewerUserId={viewerId}
          isGuestUser={isGuestUser}
        />
      </div>
      {newsSection}
    </div>
  );
}
