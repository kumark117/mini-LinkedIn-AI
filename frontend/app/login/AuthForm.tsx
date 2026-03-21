'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEMO_AUTH_BLURB } from '@/lib/demoAccounts';
import { PASSWORD_MAX, USERNAME_MAX, USERNAME_MIN } from '@/lib/authLimits';

type Mode = 'login' | 'register';

type Feedback = { message: string; variant: 'info' | 'error' };

/**
 * Tabs use full `location.assign` (same class of navigation as post-login) so mode matches the URL
 * and nothing intercepts clicks oddly. Submit buttons still use fetch + assign on success.
 */
export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [signInAfterRegister, setSignInAfterRegister] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const onLogin = () => {
    (async () => {
      const u = username.trim();
      const p = password;
      if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
        setFeedback({
          message: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
          variant: 'error'
        });
        return;
      }
      if (p.length > PASSWORD_MAX) {
        setFeedback({
          message: `Password must be at most ${PASSWORD_MAX} characters (empty for demo1–demo9).`,
          variant: 'error'
        });
        return;
      }
      setFeedback({ message: 'Signing in…', variant: 'info' });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          message: typeof data?.error === 'string' ? data.error : 'Login failed',
          variant: 'error'
        });
        return;
      }
      window.location.assign('/myposts');
    })();
  };

  const onRegister = () => {
    (async () => {
      const u = username.trim();
      const p = password;
      if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
        setFeedback({
          message: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
          variant: 'error'
        });
        return;
      }
      if (p.length > PASSWORD_MAX) {
        setFeedback({
          message: `Password must be at most ${PASSWORD_MAX} characters.`,
          variant: 'error'
        });
        return;
      }
      setFeedback({ message: 'Creating account…', variant: 'info' });
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim(),
          username: u,
          password: p,
          signInAfterRegister
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          message: typeof data?.error === 'string' ? data.error : 'Register failed',
          variant: 'error'
        });
        return;
      }
      if (data.signedIn === false) {
        setFeedback({
          message: 'Account created. Sign in with your username and password.',
          variant: 'info'
        });
        router.replace('/login', { scroll: false });
        setPassword('');
        return;
      }
      window.location.assign('/myposts');
    })();
  };

  const userHint = `Username: ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
  const passHintRegister = `Optional. 0–${PASSWORD_MAX} characters (empty = no password).`;
  const passHintLogin = `0–${PASSWORD_MAX} characters; empty for demo1–demo9 or no-password accounts.`;

  return (
    <main className="app-main">
      <h1 style={{ margin: 0, fontSize: 28 }}>Sign in or create an account</h1>
      <div className="demo-banner" role="note">
        <strong>Demo accounts:</strong> {DEMO_AUTH_BLURB}
      </div>

      <div className="auth-mode-row" role="tablist" aria-label="Sign in or register">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`auth-mode-btn${mode === 'login' ? ' auth-mode-btn-active' : ''}`}
          onClick={() => {
            setFeedback(null);
            if (mode !== 'login') window.location.assign('/login');
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`auth-mode-btn${mode === 'register' ? ' auth-mode-btn-active' : ''}`}
          onClick={() => {
            setFeedback(null);
            if (mode !== 'register') window.location.assign('/login?register=1');
          }}
        >
          Create account
        </button>
      </div>

      <div className="app-card auth-form-card" style={{ marginTop: 16 }}>
        {mode === 'register' ? (
          <>
            <label className="muted" style={{ display: 'block', fontSize: 13 }}>
              Name
            </label>
            <input
              className="app-input auth-input-narrow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
            <label className="muted" style={{ display: 'block', fontSize: 13, marginTop: 12 }}>
              Headline
            </label>
            <input
              className="app-input auth-input-narrow"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={200}
            />
          </>
        ) : null}

        <label className="muted" style={{ display: 'block', fontSize: 13, marginTop: mode === 'register' ? 12 : 0 }}>
          Username
        </label>
        <input
          className="app-input auth-input-narrow"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          maxLength={USERNAME_MAX}
        />
        <p className="field-hint">{userHint}</p>

        <label className="muted" style={{ display: 'block', fontSize: 13, marginTop: 12 }}>
          Password{' '}
          {mode === 'register' ? (
            <span className="field-hint" style={{ fontWeight: 600 }}>
              (optional)
            </span>
          ) : null}
        </label>
        <input
          className="app-input auth-input-narrow"
          value={password}
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          maxLength={PASSWORD_MAX}
        />
        <p className="field-hint">{mode === 'register' ? passHintRegister : passHintLogin}</p>

        {mode === 'register' ? (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 14,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={signInAfterRegister}
              onChange={(e) => setSignInAfterRegister(e.target.checked)}
            />
            Sign me in automatically after registering
          </label>
        ) : null}

        {mode === 'login' ? (
          <button type="button" className="app-button" onClick={onLogin}>
            Sign in
          </button>
        ) : (
          <button type="button" className="app-button" onClick={onRegister}>
            Create account
          </button>
        )}

        {feedback ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 14,
              fontWeight: 700,
              color: feedback.variant === 'error' ? '#b91c1c' : '#0f172a',
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
