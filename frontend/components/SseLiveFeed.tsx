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
  enableHeartBeatFilter = false
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
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [heartBeatOnly, setHeartBeatOnly] = useState(true);
  const seenIds = useRef<Set<number>>(new Set(initialPosts.map((p) => p.id)));
  const followedRef = useRef(followedUserIds);
  followedRef.current = followedUserIds;
  const sseAllowRef = useRef(sseOnlyUserIds);
  sseAllowRef.current = sseOnlyUserIds;

  const initialSig = useMemo(() => initialPosts.map((p) => p.id).join(','), [initialPosts]);

  // Only sync when the id-list changes — not when the parent passes a new array ref with the same ids
  // (avoids resetting `seenIds` while an SSE post is already shown, which could allow a duplicate).
  useEffect(() => {
    setPosts(dedupePostsById(initialPosts));
    seenIds.current = new Set(initialPosts.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialPosts read from render when initialSig/viewerId change
  }, [viewerId, initialSig]);

  const eventSourceUrl = useMemo(() => '/api/stream', []);

  useEffect(() => {
    const es = new EventSource(eventSourceUrl);

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

    es.addEventListener('post', onPost);
    return () => {
      es.removeEventListener('post', onPost);
      es.close();
    };
  }, [eventSourceUrl, viewerId]);

  const displayPosts = useMemo(() => {
    if (!enableHeartBeatFilter || !heartBeatOnly) return posts;
    return collapseHeartBeatToLatest(posts);
  }, [posts, enableHeartBeatFilter, heartBeatOnly]);

  return (
    <>
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
    </>
  );
}
