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
  author_username?: string | null;
  /** Whether the signed-in viewer follows the author (for Follow / Unfollow). */
  i_follow_author?: boolean;
  /** Newest first; up to 8 from DB — keeps UI in sync with comments_count */
  initial_comments?: FeedComment[];
};

export default function FeedList({
  posts,
  isAuthenticated,
  viewerUserId,
  isGuestUser
}: {
  posts: FeedPost[];
  isAuthenticated: boolean;
  viewerUserId: number | null;
  isGuestUser: boolean;
}) {
  return (
    <div className="li-feed-list">
      {posts.length === 0 ? (
        <div className="muted">No posts yet.</div>
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            isAuthenticated={isAuthenticated}
            viewerUserId={viewerUserId}
            isGuestUser={isGuestUser}
          />
        ))
      )}
    </div>
  );
}

