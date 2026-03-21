import { redirect } from 'next/navigation';

/** Single auth UI lives at /login; keep /register as a bookmark-friendly alias. */
export default function RegisterRedirectPage() {
  redirect('/login?register=1');
}
