'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { DEMO_AUTH_BLURB } from '@/lib/demoAccounts';
import { PASSWORD_MAX, USERNAME_MAX, USERNAME_MIN } from '@/lib/authLimits';
import { broadcastFeedRefresh } from '@/lib/feedBroadcast';

type Mode = 'login' | 'register';

type Feedback = { message: string; variant: 'info' | 'error' | 'success' };

/** Same label for register tab and primary submit when creating an account. */
const REGISTER_CTA = 'Create account';

const REDIRECT_AFTER_MS = 1200;

/**
 * Radios switch URL/mode (`/login` vs `?register=1`); primary submit is the solid green action.
 */
export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [signInAfterRegister, setSignInAfterRegister] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const userHint = `Username: ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
  const passHintRegister = `Optional. 0–${PASSWORD_MAX} characters (empty = no password).`;
  const passHintLogin = `0–${PASSWORD_MAX} characters; empty for demo1–demo9 or no-password accounts.`;

  const fetchOpts = {
    credentials: 'same-origin' as const,
    cache: 'no-store' as RequestCache
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

    setSubmitting(true);

    if (mode === 'login') {
      setFeedback({ message: 'Signing in…', variant: 'info' });
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...fetchOpts,
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
        const who = typeof data?.user?.username === 'string' ? data.user.username : u;
        setFeedback({
          message: `Signed in as @${who}. Opening My posts…`,
          variant: 'success'
        });
        await new Promise((r) => setTimeout(r, REDIRECT_AFTER_MS));
        broadcastFeedRefresh('session');
        window.location.assign('/myposts');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setFeedback({ message: 'Creating account…', variant: 'info' });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...fetchOpts,
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

      const who = typeof data?.user?.username === 'string' ? data.user.username : u;

      if (data.signedIn === false) {
        setFeedback({
          message: `Account @${who} created. Sign in with your username and password when you’re ready.`,
          variant: 'success'
        });
        router.replace('/login', { scroll: false });
        setPassword('');
        return;
      }

      setFeedback({
        message: `Welcome, @${who}! You’re signed in. Opening My posts…`,
        variant: 'success'
      });
      await new Promise((r) => setTimeout(r, REDIRECT_AFTER_MS));
      broadcastFeedRefresh('session');
      window.location.assign('/myposts');
    } finally {
      setSubmitting(false);
    }
  };

  const feedbackColor =
    feedback?.variant === 'error'
      ? '#b91c1c'
      : feedback?.variant === 'success'
        ? '#166534'
        : '#0f172a';

  const submitLabel =
    mode === 'login'
      ? submitting
        ? 'Signing in…'
        : 'Sign in'
      : submitting
        ? 'Creating account…'
        : REGISTER_CTA;

  return (
    <main className="app-main">
      <h1 style={{ margin: 0, fontSize: 28 }}>Sign in or create an account</h1>
      <div className="demo-banner" role="note">
        <strong>Demo accounts:</strong> {DEMO_AUTH_BLURB}
      </div>

      <fieldset className="auth-mode-fieldset">
        <legend className="auth-mode-legend">Account type</legend>
        <div className="auth-mode-radios">
          <label className="auth-radio-pill">
            <input
              type="radio"
              name="accountType"
              value="existing"
              checked={mode === 'login'}
              onChange={() => {
                setFeedback(null);
                if (mode !== 'login') window.location.assign('/login');
              }}
            />
            <span>Existing account</span>
          </label>
          <label className="auth-radio-pill">
            <input
              type="radio"
              name="accountType"
              value="create"
              checked={mode === 'register'}
              onChange={() => {
                setFeedback(null);
                if (mode !== 'register') window.location.assign('/login?register=1');
              }}
            />
            <span>Create account</span>
          </label>
        </div>
      </fieldset>

      <form className="app-card auth-form-card" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
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

        <button type="submit" className="auth-form-submit" disabled={submitting}>
          {submitLabel}
        </button>

        {feedback ? (
          <div
            className={`auth-feedback auth-feedback--${feedback.variant}`}
            style={{
              marginTop: 14,
              fontSize: 14,
              fontWeight: 700,
              color: feedbackColor,
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </div>
        ) : null}
      </form>
    </main>
  );
}
