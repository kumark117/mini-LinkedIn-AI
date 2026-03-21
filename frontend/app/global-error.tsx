'use client';

/**
 * Root-level error UI when the root layout fails. Must define its own html/body.
 * Include base styles inline so this page is readable even if CSS chunks fail to load.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          background: '#ecfdf5',
          color: '#020617'
        }}
      >
        <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#14532d' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            fontWeight: 700,
            cursor: 'pointer',
            borderRadius: 10,
            border: '2px solid #166534',
            background: '#fff'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
