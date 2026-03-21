import { prisma } from './db';
import { broadcastNewPost } from './sse';

/** ASCII ETX (end-of-text, code 3) — marks automated pulse lines in the feed. */
const ETX = '\u0003';

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

      const content = `${ETX} HeartBeat · server time ${new Date().toISOString()}`;
      const created = await prisma.post.create({
        data: { userId: cred.userId, content }
      });

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
