'use client';

import { useEffect, useState } from 'react';

type Tick = {
  clock: string;
  msPart: string;
  tz: string;
  ms?: number;
};

/**
 * Live server time (Node process local timezone) via SSE (/api/clock).
 */
export default function ServerClock() {
  const [tick, setTick] = useState<Tick | null>(null);
  const [status, setStatus] = useState<'connecting' | 'live' | 'stale'>('connecting');

  useEffect(() => {
    const es = new EventSource('/api/clock');

    const onTick = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data as string) as Partial<Tick>;
        if (
          typeof data.clock === 'string' &&
          typeof data.msPart === 'string' &&
          typeof data.tz === 'string'
        ) {
          setTick({
            clock: data.clock,
            msPart: data.msPart,
            tz: data.tz
          });
          setStatus('live');
        }
      } catch {
        /* ignore */
      }
    };

    const onError = () => {
      setStatus('stale');
    };

    es.addEventListener('tick', onTick);
    es.addEventListener('error', onError);

    return () => {
      es.removeEventListener('tick', onTick);
      es.removeEventListener('error', onError);
      es.close();
    };
  }, []);

  const shortTz =
    tick != null ? (tick.tz.length > 18 ? tick.tz.replace(/^.+\//, '') : tick.tz) : '';

  return (
    <div
      className="server-clock"
      title={
        tick != null
          ? `Server local time (${tick.tz}) over SSE — ~10 ticks/sec`
          : 'Server clock'
      }
      suppressHydrationWarning
    >
      <span className="server-clock__label">srv {shortTz || 'local'}</span>
      <span className="server-clock__time">
        {tick != null ? (
          <>
            {tick.clock}.<span className="server-clock__ms">{tick.msPart}</span>
          </>
        ) : (
          <>
            —:—:—.<span className="server-clock__ms">———</span>
          </>
        )}
      </span>
      <span className={`server-clock__dot server-clock__dot--${status}`} aria-hidden />
    </div>
  );
}
