import { redirect } from 'next/navigation';

/** Legacy URL — the shared feed was removed; everyone lands on their own posts. */
export default function FeedGonePage() {
  redirect('/myposts');
}
