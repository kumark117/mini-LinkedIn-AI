'use client';

import { useState } from 'react';
import { formatFeedTimestamp } from '@/lib/formatFeedDate';
import type { FeedPost } from './FeedList';
import CommentsPanel from './CommentsPanel';

export default function PostCard({
  post,
  isAuthenticated
}: {
  post: FeedPost;
  isAuthenticated: boolean;
}) {
  const [likesCount, setLikesCount] = useState<number>(post.likes_count ?? 0);
  const [likedByMe, setLikedByMe] = useState<boolean>(Boolean(post.liked_by_me));

  const onToggleLike = async () => {
    if (!isAuthenticated) return;
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'like', post_id: post.id })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    if (typeof data.likes_count === 'number') setLikesCount(data.likes_count);
    if (typeof data.liked_by_me === 'boolean') setLikedByMe(data.liked_by_me);
  };

  const likeSlot = (
    <button
      type="button"
      onClick={() => void onToggleLike()}
      disabled={!isAuthenticated}
      title={isAuthenticated ? undefined : 'Sign in to like'}
      className={`li-reaction${likedByMe ? ' li-reaction--on' : ''}`}
    >
      {likedByMe ? 'Liked' : 'Like'}
      {likesCount > 0 ? ` · ${likesCount}` : ''}
    </button>
  );

  return (
    <article className="li-post">
      <div className="li-post__body li-post__body--merged">
        {post.created_at ? (
          <span className="li-post__time">{formatFeedTimestamp(post.created_at)}</span>
        ) : null}
        {post.created_at ? <span className="li-post__time-sep"> · </span> : null}
        <span className="li-post__text">{post.content}</span>
      </div>
      <div className="li-post__divider" aria-hidden />
      <div className="li-comments">
        <CommentsPanel postId={post.id} isAuthenticated={isAuthenticated} leadingSlot={likeSlot} />
      </div>
    </article>
  );
}
