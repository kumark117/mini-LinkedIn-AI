/** Pre-seeded users (migrations); sign in with an empty password on the auth screen. */
export function isReservedDemoUsername(username: string): boolean {
  const u = username.trim().toLowerCase();
  if (u === 'guest' || u === 'heartbeat') return true;
  return /^demo[1-9]$/.test(u) || /^dem[1-9]$/.test(u);
}

/** Single copy for the combined login + register screen. */
export const DEMO_AUTH_BLURB =
  'You start as Guest automatically (no sign-in). To sign in manually: guest or demo1–demo9 with an empty password. HeartBeat (empty password) is the automated time-pulse account — it posts a server timestamp every minute to the public feed. New accounts: username 3–80 characters; password optional (0–20 characters, empty = no password).';
