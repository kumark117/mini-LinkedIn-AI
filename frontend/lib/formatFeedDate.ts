/**
 * Format an ISO instant in the **runtime’s local timezone** (browser on the client,
 * Node/server default TZ during SSR). Use `suppressHydrationWarning` on the wrapping
 * element when this runs in a client component so server vs client TZ mismatches don’t warn.
 */
export function formatFeedTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZoneName: 'short'
    }).format(d);
  } catch {
    return iso;
  }
}
