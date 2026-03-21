import { prisma } from './db';
import { broadcastNewPost } from './sse';

/** ASCII ETX (end-of-text, code 3) — marks automated pulse lines in the feed. */
const ETX = '\u0003';

/** Keep at most this many HeartBeat posts (24h × 60 min). */
const HEARTBEAT_POST_CAP = 24 * 60;

/**
 * Every wall-clock minute, create a post as user `HeartBeat` and fan out via SSE (same path as manual posts).
 * Disabled when `HEARTBEAT_PULSE=false` in env. Requires custom `server.ts` (not plain `next start` without it).
 */
export function startHeartBeatPulse(): void {
  if (process.env.HEARTBEAT_PULSE === 'false') {
    return;
  }

  const tick = async () => {
    try {
      const cred = await prisma.userCredential.findUnique({
        where: { username: 'HeartBeat' },
        select: { userId: true }
      });
      if (!cred) return;

      /* Node’s Intl rejects dateStyle+timeStyle together with timeZoneName — keep styles only. */
      const d = new Date();
      const when = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }).format(d);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const content = `${ETX} HeartBeat · ${when} (${tz})`;
      const created = await prisma.post.create({
        data: { userId: cred.userId, content }
      });

      const stale = await prisma.post.findMany({
        where: { userId: cred.userId },
        orderBy: { createdAt: 'desc' },
        skip: HEARTBEAT_POST_CAP,
        select: { id: true }
      });
      if (stale.length > 0) {
        await prisma.post.deleteMany({
          where: { id: { in: stale.map((p) => p.id) } }
        });
      }

      broadcastNewPost({
        id: created.id,
        user_id: created.userId,
        content: created.content,
        created_at: created.createdAt.toISOString(),
        author_username: 'HeartBeat'
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[HeartBeat]', err);
    }
  };

  const msToNextMinute = () => 60_000 - (Date.now() % 60_000);

  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), 60_000);
  }, msToNextMinute());
}
