'use client';

import PostCard from './PostCard';

/** Matches WebSocket/API comment shape; seeded from the server on feed load. */
export type FeedComment = {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
};

export type FeedPost = {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  liked_by_me?: boolean;
  /** Newest first; up to 8 from DB — keeps UI in sync with comments_count */
  initial_comments?: FeedComment[];
};

export default function FeedList({
  posts,
  isAuthenticated
}: {
  posts: FeedPost[];
  isAuthenticated: boolean;
}) {
  return (
    <div className="li-feed-list">
      {posts.length === 0 ? (
        <div className="muted">No posts yet.</div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} isAuthenticated={isAuthenticated} />)
      )}
    </div>
  );
}

