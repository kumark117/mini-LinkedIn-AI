'use client';

import { useLayoutEffect, useState } from 'react';
import { formatFeedTimestamp } from '@/lib/formatFeedDate';

/**
 * Formats `iso` only in the browser so the label matches the viewer’s timezone.
 * SSR/Node often runs in UTC; formatting there made times ~5.5h off for IST (and similar elsewhere).
 */
export default function ClientLocalTime({
  iso,
  className,
  title = 'Your local time'
}: {
  iso: string;
  className?: string;
  title?: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useLayoutEffect(() => {
    setText(formatFeedTimestamp(iso));
  }, [iso]);

  return (
    <time className={className} dateTime={iso} title={title} suppressHydrationWarning>
      {text ?? '…'}
    </time>
  );
}
