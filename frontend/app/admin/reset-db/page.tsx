import Link from 'next/link';
import ResetDbForm from './ResetDbForm';

export const dynamic = 'force-dynamic';

export default function AdminResetDbPage() {
  const enabled = process.env.ALLOW_DB_RESET === 'true';

  return (
    <main className="app-main">
      <h1 style={{ marginTop: 0 }}>Database reset</h1>
      <p style={{ marginBottom: 16 }} className="muted">
        <Link href="/myposts" prefetch={false}>
          ← Back to app
        </Link>
      </p>
      {!enabled ? (
        <div className="app-card" style={{ maxWidth: 520, borderColor: '#b45309', background: '#fffbeb' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#92400e' }}>Reset API is disabled</p>
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 14 }}>
            Set <code>ALLOW_DB_RESET=true</code> and <code>DB_RESET_PASSWORD</code> in <code>frontend/.env</code>, then
            restart the dev server.
          </p>
        </div>
      ) : (
        <ResetDbForm />
      )}
    </main>
  );
}
