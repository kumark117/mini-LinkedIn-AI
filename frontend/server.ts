// Custom server runs outside Next's env loader — load env before Prisma/auth imports.
import path from 'path';
import { config as dotenvConfig } from 'dotenv';

if (process.env.NODE_ENV === 'production') {
  dotenvConfig({ path: path.join(process.cwd(), '.env.production') });
}
dotenvConfig({ path: path.join(process.cwd(), '.env') });

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { prisma } from './lib/db';
import { getTokenFromCookieHeader, verifyAuthToken } from './lib/auth';
import { registerLikeBroadcaster } from './lib/wsLikeBroadcast';
import { startHeartBeatPulse } from './lib/heartBeatPulse';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
// Bind all interfaces for LAN/Docker; keep separate from Next's idea of "hostname" (below).
const listenHost = process.env.LISTEN_HOSTNAME || '0.0.0.0';

// Never pass hostname: '0.0.0.0' into next() — HTML will reference
// http://0.0.0.0:3000/_next/... and the browser will not load CSS/JS (unstyled page).
const app = next({ dev, port });
const handle = app.getRequestHandler();
const handleUpgrade = app.getUpgradeHandler();

const server = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url || '/', true);
    await handle(req, res, parsedUrl);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error handling', req.url, err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

// WebSocket server is attached to the same HTTP server.
// We only support `/ws/comments` for this project.
const wss = new WebSocketServer({ noServer: true });

registerLikeBroadcaster((payload) => {
  const body = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(body);
    }
  }
});

server.on('upgrade', (req, socket, head) => {
  const url = req.url ? parse(req.url) : null;
  const pathname = url?.pathname ?? '';

  if (pathname === '/ws/comments') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
    return;
  }

  // Dev HMR / internal upgrades must reach Next — destroying them causes
  // "Invariant: missing bootstrap script".
  void handleUpgrade(req, socket, head).catch(() => socket.destroy());
});

wss.on('connection', (ws, req) => {
  const cookieHeader = (req.headers as unknown as { cookie?: string }).cookie;
  const token = getTokenFromCookieHeader(cookieHeader);
  const auth = token ? verifyAuthToken(token) : null;
  const userId = auth?.userId;

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as {
        type?: string;
        postId?: number;
        content?: string;
      };

      if (msg.type !== 'comment') return;
      if (!userId) {
        ws.send(JSON.stringify({ event: 'error', message: 'Unauthorized' }));
        return;
      }
      if (typeof msg.postId !== 'number' || typeof msg.content !== 'string') return;

      const content = msg.content.trim();
      if (!content) return;

      const created = await prisma.comment.create({
        data: {
          postId: msg.postId,
          userId,
          content
        }
      });

      const comment = {
        id: created.id,
        post_id: created.postId,
        user_id: created.userId,
        content: created.content,
        created_at: created.createdAt.toISOString()
      };

      const payload = JSON.stringify({
        event: 'comment',
        postId: msg.postId,
        comment
      });

      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
          client.send(payload);
        }
      }
    } catch {
      // ignore invalid payloads and DB errors for this demo
    }
  });
});

app
  .prepare()
  .then(() => {
    server.listen(port, listenHost, () => {
      const openHost = listenHost === '0.0.0.0' ? 'localhost' : listenHost;
      // eslint-disable-next-line no-console
      console.log(`Next server ready on http://${openHost}:${port}`);
      startHeartBeatPulse();
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err);
    process.exit(1);
  });
