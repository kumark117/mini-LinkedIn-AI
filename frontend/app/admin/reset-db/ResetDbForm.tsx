'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetDbForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="app-card" style={{ maxWidth: 520 }}>
      <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5 }}>
        This runs <strong>prisma migrate reset --force</strong>: all data is deleted and every migration is reapplied.
        Use only on a local demo database.
      </p>
      <label htmlFor="db-reset-pass" style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        DB superuser / reset password
      </label>
      <input
        id="db-reset-pass"
        type="password"
        autoComplete="off"
        className="app-input"
        style={{ marginTop: 0 }}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Matches DB_RESET_PASSWORD in .env"
      />
      <button
        type="button"
        className="app-button"
        disabled={busy || !password}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setMessage(null);
            setDetail(null);
            setError(null);
            try {
              const res = await fetch('/api/admin/reset-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ password })
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                const msg =
                  typeof data?.error === 'string'
                    ? data.error
                    : `Request failed (${res.status})`;
                const extra =
                  [data.stdout, data.stderr].filter(Boolean).join('\n') || null;
                setError(msg);
                setDetail(extra);
                return;
              }
              setMessage(typeof data?.message === 'string' ? data.message : 'Reset complete.');
              setDetail(typeof data?.output === 'string' ? data.output : null);
              setPassword('');
              router.refresh();
            } catch {
              setError('Network error');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? 'Resetting…' : 'Reset database'}
      </button>
      {message ? (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: '#166534', fontWeight: 600 }}>{message}</p>
      ) : null}
      {error ? (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: '#b91c1c', fontWeight: 600 }}>{error}</p>
      ) : null}
      {detail ? (
        <pre
          style={{
            marginTop: 10,
            fontSize: 11,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 240,
            overflow: 'auto',
            background: '#f8fafc',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #e2e8f0'
          }}
        >
          {detail}
        </pre>
      ) : null}
    </div>
  );
}
