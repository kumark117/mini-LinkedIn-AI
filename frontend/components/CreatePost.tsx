'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AiFeatureDecor from '@/components/AiFeatureDecor';
import { broadcastFeedRefresh } from '@/lib/feedBroadcast';

export default function CreatePost({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const canSubmit = isAuthenticated && content.trim().length > 0 && !posting;
  /** Always show Post / Enhance when signed in so AI isn’t hidden until focus or typing. */
  const showToolbar = isAuthenticated;
  const tallComposer = expanded || content.trim().length > 0;

  const submitPost = async () => {
    if (!canSubmit || posting) return;
    setPosting(true);
    setStatus('Posting…');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ content: content.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data?.error === 'string' ? data.error : 'Failed to post');
        return;
      }
      setContent('');
      setStatus(null);
      setExpanded(false);
      router.refresh();
      broadcastFeedRefresh('post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="li-composer">
      <div className="li-composer__avatar" aria-hidden />
      <div className="li-composer__body">
        {!isAuthenticated ? (
          <p className="li-composer__hint muted">
            <Link href="/login">Sign in</Link> to start a post.
          </p>
        ) : null}
        <textarea
          className="li-composer__input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submitPost();
            }
          }}
          placeholder={isAuthenticated ? 'Start a post…' : 'Sign in to post'}
          title={isAuthenticated ? 'Enter to post · Shift+Enter for a new line' : undefined}
          disabled={!isAuthenticated}
          rows={tallComposer ? 3 : 1}
        />
        {showToolbar ? (
          <div className="li-composer__toolbar">
            <button
              type="button"
              disabled={!canSubmit}
              className="li-btn-primary"
              onClick={() => void submitPost()}
            >
              Post
            </button>
            <button
              type="button"
              className="li-ai-feature-btn"
              disabled={!content.trim()}
              onClick={() => {
                void (async () => {
                  if (!content.trim()) return;
                  setStatus('Enhancing with AI…');
                  const res = await fetch('/api/ai/enhance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ input: content })
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setStatus(typeof data?.error === 'string' ? data.error : 'AI enhance failed');
                    return;
                  }
                  setContent(data.output ?? content);
                  setStatus(null);
                })();
              }}
            >
              <AiFeatureDecor />
              <span className="li-ai-feature-btn__text">Enhance with AI</span>
            </button>
          </div>
        ) : null}
        {status ? <p className="li-composer__status">{status}</p> : null}
      </div>
    </div>
  );
}
