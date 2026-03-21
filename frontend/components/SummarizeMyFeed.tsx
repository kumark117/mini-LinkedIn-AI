'use client';

import { useState } from 'react';

export default function SummarizeMyFeed() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="li-feed-tools">
      <button
        type="button"
        disabled={loading}
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
        className="li-text-btn"
      >
        {loading ? 'Summarizing…' : 'Summarize my posts'}
      </button>

      {error ? (
        <div style={{ marginTop: 6, fontSize: 12 }} className="muted">
          {error}
        </div>
      ) : null}
      {output ? (
        <pre
          style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.45 }}
          className="muted"
        >
          {output}
        </pre>
      ) : null}
    </div>
  );
}

