'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { formatFeedTimestamp } from '@/lib/formatFeedDate';
import { useWsComments } from './WsCommentsProvider';

export default function CommentsPanel({
  postId,
  isAuthenticated,
  leadingSlot
}: {
  postId: number;
  isAuthenticated: boolean;
  /** e.g. Like control, merged on the same row as the comment field */
  leadingSlot?: ReactNode;
}) {
  const { commentsByPostId, sendComment, isConnected } = useWsComments();
  const comments = commentsByPostId[postId] ?? [];
  const [content, setContent] = useState('');

  const canComment = isConnected && isAuthenticated;
  const placeholder = !isConnected
    ? 'Connecting…'
    : !isAuthenticated
      ? 'Sign in to comment'
      : 'Add a comment…';

  const submit = () => {
    if (!content.trim() || !isAuthenticated) return;
    sendComment(postId, content.trim());
    setContent('');
  };

  return (
    <div>
      <div className={`li-comment-form${leadingSlot ? ' li-comment-form--merged' : ''}`}>
        {leadingSlot}
        <input
          className="li-comment-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canComment && content.trim()) submit();
            }
          }}
          placeholder={placeholder}
          disabled={!canComment}
          aria-label="Write a comment"
        />
        <button
          type="button"
          disabled={!canComment || !content.trim()}
          className="li-comment-post"
          onClick={() => submit()}
        >
          Post
        </button>
      </div>

      {comments.length > 0 ? (
        <div className="li-comment-list">
          {comments.slice(0, 8).map((c) => (
            <div key={c.id} className="li-comment-row">
              <span className="li-comment-row__time" suppressHydrationWarning title="Your local time">
                {formatFeedTimestamp(c.created_at)}
              </span>
              <span className="li-comment-row__text">{c.content}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
