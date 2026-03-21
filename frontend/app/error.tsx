'use client';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-main" style={{ maxWidth: 560 }}>
      <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
      <p className="muted" style={{ fontSize: 15 }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button type="button" className="app-button app-button-inline" style={{ marginTop: 16 }} onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
