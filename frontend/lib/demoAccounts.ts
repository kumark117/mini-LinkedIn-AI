/** Pre-seeded users (migrations); sign in with an empty password on the auth screen. */
export function isReservedDemoUsername(username: string): boolean {
  const u = username.trim().toLowerCase();
  if (u === 'guest') return true;
  return /^demo[1-9]$/.test(u) || /^dem[1-9]$/.test(u);
}

/** Single copy for the combined login + register screen. */
export const DEMO_AUTH_BLURB =
  'You start as Guest automatically (no sign-in). To sign in manually: username guest with an empty password, or demo1–demo9 with an empty password. New accounts: username 3–80 characters; password optional (0–20 characters, empty = no password).';
