# Saved from chat (follow-ups)

1. **Multi-tab / multi-account** — One browser = one auth cookie (last sign-in wins). `SessionSyncNotice` warns when `/api/auth/me` shows a different user than last time in this tab. Live posts use same-origin `/api/stream` so Discover updates immediately without waiting on FastAPI. For two accounts at once, use **two browsers** or **incognito + normal**.
2. **Testing** — After auth/sign-out feels solid: exercise **multiple users** (register / sign in / guest).
3. **Feature idea** — **Broadcast short message**: logged-in user sends a notice to **all** users (needs design: SSE fan-out, persistence, or admin-only).
4. **Later** — Walk through **Render vs Vercel** for hosting this app (custom `server.ts`, WebSockets, SSE, Postgres).
