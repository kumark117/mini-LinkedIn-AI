'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FeedList, { FeedPost } from './FeedList';

type SsePostEvent = {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
};

export default function SseLiveFeed({
  viewerId,
  initialPosts,
  isAuthenticated,
  onlyAuthorUserId
}: {
  /** When this changes (switch accounts), reset list even if post IDs are unchanged — liked_by_me differs per user. */
  viewerId: number | null;
  initialPosts: FeedPost[];
  isAuthenticated: boolean;
  /** If set, live stream only prepends posts authored by this user (e.g. “My posts” page). */
  onlyAuthorUserId?: number | null;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const seenIds = useRef<Set<number>>(new Set(initialPosts.map((p) => p.id)));

  const initialSig = useMemo(() => initialPosts.map((p) => p.id).join(','), [initialPosts]);

  useEffect(() => {
    setPosts(initialPosts);
    seenIds.current = new Set(initialPosts.map((p) => p.id));
  }, [viewerId, initialSig, initialPosts]);

  const eventSourceUrl = useMemo(() => '/api/stream', []);

  useEffect(() => {
    const es = new EventSource(eventSourceUrl);

    const onPost = (ev: MessageEvent) => {
      try {
        const post = JSON.parse(ev.data) as SsePostEvent;
        if (onlyAuthorUserId != null && post.user_id !== onlyAuthorUserId) return;
        if (seenIds.current.has(post.id)) return;
        seenIds.current.add(post.id);

        const mapped: FeedPost = {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          created_at: post.created_at,
          likes_count: 0,
          comments_count: 0,
          liked_by_me: false,
          initial_comments: []
        };

        setPosts((prev) => [mapped, ...prev].slice(0, 30));
      } catch {
        // ignore malformed SSE payloads
      }
    };

    es.addEventListener('post', onPost);
    return () => {
      es.removeEventListener('post', onPost);
      es.close();
    };
  }, [eventSourceUrl, viewerId, onlyAuthorUserId]);

  return <FeedList posts={posts} isAuthenticated={isAuthenticated} />;
}

