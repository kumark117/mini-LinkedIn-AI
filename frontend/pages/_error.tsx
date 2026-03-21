import type { NextPageContext } from 'next';

/**
 * Pages-router fallback so the dev server always has error components available
 * (avoids "missing required error components, refreshing" when app rendering fails).
 */
export default function PagesError({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 560, color: '#020617' }}>
      <h1 style={{ marginTop: 0 }}>{statusCode === 404 ? 'Not found' : 'Something went wrong'}</h1>
      <p style={{ fontSize: 16, lineHeight: 1.5 }}>
        {statusCode === 404
          ? 'This page could not be found.'
          : statusCode
            ? `Server responded with status ${statusCode}.`
            : 'An error occurred while rendering this page.'}
      </p>
      <p style={{ marginTop: 16 }}>
        <a href="/" style={{ color: '#1d4ed8', fontWeight: 700 }}>
          Go home
        </a>
      </p>
    </div>
  );
}

PagesError.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};
