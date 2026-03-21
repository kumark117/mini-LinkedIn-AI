# Deploying on Vercel (heads-up)

This app runs **locally** with a **custom Node server** (`server.ts`: HTTP + **WebSocket** `/ws/comments`).

## What works on Vercel (default Next server)

- **Next.js** pages, API routes, **Prisma** + **Postgres** (use Neon / Supabase / RDS; set `DATABASE_URL`).
- **SSE** streams (e.g. `/api/stream`, `/api/clock`) — routes set `export const maxDuration = 60` (needs **Vercel Pro** for long-lived streams beyond Hobby limits).
- **JWT cookie auth**, register/login, migrations run from CI or manually (not via the demo `/api/admin/reset-db` spawn in production).

## What does **not** work without changes

1. **`npm run start` / Vercel** use the **standard** Next server — **not** `tsx server.ts`.  
   **WebSocket comments** (`/ws/comments`) will **not** be available unless you:
   - move realtime to **Pusher / Ably / Partykit / Supabase Realtime**, **or**
   - host the WS service elsewhere and point the client to it.

2. **In-memory pub/sub** (`lib/sse.ts` `globalThis` subscribers): with **multiple** serverless instances, **post broadcasts** may only reach clients on the **same** instance as the poster. For reliable feed updates on Vercel, use a **shared** bus (Redis, etc.) or **polling** / **revalidate**.

3. **`/api/admin/reset-db`** spawns `prisma migrate reset` — **not suitable** for production on Vercel; keep `ALLOW_DB_RESET` off and run migrations in CI.

4. **Execution time**: Hobby functions can end long streams (~10s). Use **Pro** + `maxDuration` (see `vercel.json` if present) for SSE.

## Suggested path for “full parity” on Vercel

- Replace WS comments with a **managed realtime** product or **SSE-only** comment fan-out backed by Redis.
- Use **Neon** (or similar) + `prisma migrate deploy` in build or a release job.
