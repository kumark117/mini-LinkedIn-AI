'use client';

import { useState } from 'react';
import AiFeatureDecor from '@/components/AiFeatureDecor';

function ClipboardIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SummarizeMyFeed() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copySummary = async () => {
    if (!output?.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // eslint-disable-next-line no-alert
      window.alert('Could not copy — try selecting the text manually.');
    }
  };

  return (
    <div className="li-feed-tools">
      <button
        type="button"
        disabled={loading}
        className="li-ai-feature-btn"
        aria-busy={loading}
        onClick={() => {
          void (async () => {
            setLoading(true);
            setError(null);
            setOutput(null);
            try {
              const resp = await fetch('/api/ai/summarize', {
                method: 'POST',
                credentials: 'same-origin'
              });
              const data = await resp.json().catch(() => ({}));
              if (!resp.ok) {
                setError(typeof data?.error === 'string' ? data.error : 'Summarize failed');
                return;
              }
              setOutput(data?.output ?? '');
            } catch {
              setError('Summarize failed');
            } finally {
              setLoading(false);
            }
          })();
        }}
      >
        <AiFeatureDecor />
        <span className="li-ai-feature-btn__text">{loading ? 'Summarizing with AI…' : 'Summarize with AI'}</span>
      </button>

      {error ? (
        <div style={{ marginTop: 6, fontSize: 12 }} className="muted">
          {error}
        </div>
      ) : null}
      {output ? (
        <div className="li-ai-summary-box">
          <div className="li-ai-summary-box__bar">
            <span className="li-ai-summary-box__title">
              <span className="li-ai-summary-box__sparkle" aria-hidden>
                ✨
              </span>
              AI summary
            </span>
            <button
              type="button"
              className="li-ai-summary-copy"
              onClick={() => void copySummary()}
              title="Copy summary to clipboard"
            >
              {copied ? (
                <>
                  <CheckIcon />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <ClipboardIcon />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="li-ai-summary-box__body muted">{output}</pre>
        </div>
      ) : null}
    </div>
  );
}
