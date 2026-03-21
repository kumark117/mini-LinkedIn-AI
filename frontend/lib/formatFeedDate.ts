/**
 * Format an ISO instant in the **runtime’s local timezone**.
 * Note: `dateStyle` + `timeStyle` + `timeZoneName` together throws on Node’s Intl — do not add timeZoneName here.
 */
export function formatFeedTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  } catch {
    try {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
    } catch {
      return iso;
    }
  }
}
