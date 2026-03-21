import { subscribeToNewPosts } from '@/lib/sse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Long-lived SSE; increase on Vercel Pro if needed. */
export const maxDuration = 60;

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToNewPosts((post) => {
        controller.enqueue(
          encoder.encode(`event: post\ndata: ${JSON.stringify(post)}\n\n`)
        );
      });

      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}

