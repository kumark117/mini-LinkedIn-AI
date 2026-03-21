'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatFeedTimestamp } from '@/lib/formatFeedDate';
import type { FeedPost } from './FeedList';
import CommentsPanel from './CommentsPanel';
import FollowAuthor from './FollowAuthor';
import { useWsComments } from './WsCommentsProvider';

export default function PostCard({
  post,
  isAuthenticated,
  viewerUserId,
  isGuestUser
}: {
  post: FeedPost;
  isAuthenticated: boolean;
  viewerUserId: number | null;
  isGuestUser: boolean;
}) {
  const { liveLikeCounts } = useWsComments();
  const [likesCount, setLikesCount] = useState<number>(post.likes_count ?? 0);
  const [likedByMe, setLikedByMe] = useState<boolean>(Boolean(post.liked_by_me));

  useEffect(() => {
    setLikesCount(post.likes_count ?? 0);
    setLikedByMe(Boolean(post.liked_by_me));
  }, [post.id, post.likes_count, post.liked_by_me]);

  const live = liveLikeCounts[post.id];
  useEffect(() => {
    if (live !== undefined) setLikesCount(live);
  }, [post.id, live]);

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

  const authorName = post.author_username?.trim();
  const showAuthor = Boolean(authorName);

  return (
    <article className="li-post">
      <div className="li-post__body li-post__body--merged">
        {post.created_at ? (
          <span className="li-post__time">{formatFeedTimestamp(post.created_at)}</span>
        ) : null}
        {post.created_at ? <span className="li-post__time-sep"> · </span> : null}
        {showAuthor ? (
          <>
            <span className="li-post__author">
              {!viewerUserId || isGuestUser || viewerUserId === post.user_id ? (
                <Link href={`/user/${encodeURIComponent(authorName!)}`} className="li-follow-profile-link">
                  @{authorName}
                </Link>
              ) : (
                <FollowAuthor
                  targetUserId={post.user_id}
                  targetUsername={authorName!}
                  initiallyFollowing={Boolean(post.i_follow_author)}
                  viewerUserId={viewerUserId}
                  isGuestUser={isGuestUser}
                  compact
                />
              )}
            </span>
            <span className="li-post__time-sep"> · </span>
          </>
        ) : null}
        <span className="li-post__text">{post.content}</span>
      </div>
      <div className="li-post__divider" aria-hidden />
      <div className="li-comments">
        <CommentsPanel postId={post.id} isAuthenticated={isAuthenticated} leadingSlot={likeSlot} />
      </div>
    </article>
  );
}
