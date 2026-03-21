/**
 * Base URL for server-side fetch() to FastAPI (Next route handlers, lib/sse).
 *
 * On Windows, Node often resolves `localhost` to IPv6 (::1) while uvicorn commonly
 * binds `--host 127.0.0.1`, so `fetch('http://localhost:8000/...')` fails with ECONNREFUSED.
 * We rewrite localhost → 127.0.0.1 for outbound requests.
 *
 * In development, if FASTAPI_BASE_URL is unset, defaults to http://127.0.0.1:8000.
 */
export function getServerFastApiBaseUrl(): string {
  const raw = process.env.FASTAPI_BASE_URL?.trim();
  const resolved =
    raw || (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:8000' : '');
  if (!resolved) return '';
  return normalizeLocalhostToIpv4Origin(resolved);
}

function normalizeLocalhostToIpv4Origin(base: string): string {
  try {
    const u = new URL(base);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
    }
    return u.origin;
  } catch {
    return base.replace(/\/$/, '');
  }
}
