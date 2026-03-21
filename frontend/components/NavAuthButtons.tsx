'use client';

/**
 * Nav Sign in / Register as real buttons (same control type as Sign out), with assign navigation
 * so behavior matches other auth flows that hard-navigate.
 */
export default function NavAuthButtons() {
  return (
    <>
      <button
        type="button"
        className="app-nav-auth-btn app-nav-auth-btn--outline"
        onClick={() => {
          window.location.assign('/login');
        }}
      >
        Sign in
      </button>
      <button
        type="button"
        className="app-nav-auth-btn app-nav-auth-btn--solid"
        onClick={() => {
          window.location.assign('/login?register=1');
        }}
      >
        Register
      </button>
    </>
  );
}
