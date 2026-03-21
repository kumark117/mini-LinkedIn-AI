import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Vercel: raise in dashboard / vercel.json if ticks stop after ~10s on Hobby. */
export const maxDuration = 60;

/**
 * Server time over SSE (~10 ticks/sec). Closes cleanly when the client disconnects.
 * Fine for Vercel streaming; avoid much higher rates (invocation + bandwidth).
 */
export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const tick = () => {
        const d = new Date();
        const payload = JSON.stringify({
          ms: d.getTime(),
          isoUtc: d.toISOString(),
          clock: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
          msPart: String(d.getMilliseconds()).padStart(3, '0'),
          tz
        });
        controller.enqueue(encoder.encode(`event: tick\ndata: ${payload}\n\n`));
      };

      tick();
      const interval = setInterval(tick, 100);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
