export default function PagesNotFound() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 560, color: '#020617' }}>
      <h1 style={{ marginTop: 0 }}>404</h1>
      <p style={{ fontSize: 16 }}>This page could not be found.</p>
      <p style={{ marginTop: 16 }}>
        <a href="/" style={{ color: '#1d4ed8', fontWeight: 700 }}>
          Go home
        </a>
      </p>
    </div>
  );
}
