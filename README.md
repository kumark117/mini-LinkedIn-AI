# Mini-LinkedIn AI

A small LinkedIn-style demo: **Next.js 14** (App Router + custom `server.ts`), **PostgreSQL** via **Prisma**, **FastAPI** for AI + SSE news, **WebSockets** for live comments/likes, and optional **OpenAI** (summarize / enhance).

## Live demo (Render)

This project is deployed on **[Render](https://render.com)**. The public web app (Next.js) is here:

**[https://web-svc-mini-linkedin-ai.onrender.com](https://web-svc-mini-linkedin-ai.onrender.com)**

The FastAPI service and Postgres are separate Render resources; see **[DEPLOY-RENDER.md](./DEPLOY-RENDER.md)** for architecture and env vars. Free-tier services may **cold-start** after idle (first load can take a short while).

## Architecture

| Piece | Role |
|--------|------|
| `frontend/` | Next.js UI, auth (JWT cookie), Prisma, `/api/stream` for instant post SSE |
| `backend/` | FastAPI — AI routes, RSS headlines demo, optional fan-out to SSE clients |
| PostgreSQL | Single source of truth for users, posts, follows, likes, comments |

Live post events use **same-origin** `/api/stream` first; FastAPI is used for RSS `event: news` when configured.

## Prerequisites

- **Node.js** 20+ and **npm**
- **Python** 3.12+ with `pip`
- **PostgreSQL** (local install or Docker — see `docker-compose.yml`)

## Local setup

### 1. Database

```bash
docker compose up -d
```

Creates Postgres with the DB name in `docker-compose.yml` (`mini-linkedin-AI`). Adjust credentials in your env files to match.

### 2. Environment variables

- **Repo root** — copy `.env.example` → `.env` (FastAPI / OpenAI / optional `SSE_BROADCAST_SECRET`).
- **Frontend** — copy `frontend/.env.example` → `frontend/.env` and set at least:
  - `DATABASE_URL` — must match your Postgres (same DB name/user/password as compose or local install).
  - `JWT_SECRET` — long random string.
  - `FASTAPI_BASE_URL` and `NEXT_PUBLIC_FASTAPI_SSE_ORIGIN` — e.g. `http://127.0.0.1:8000` when running FastAPI locally.

Never commit real `.env` files.

### 3. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
# From backend/ — uvicorn loads main:app
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 4. Frontend (Next + custom server)

```bash
cd frontend
npm install
npm run dev
```

`npm run dev` runs migrations when needed, then starts the custom server (default **http://localhost:3000**). WebSockets attach to the same process.

### Useful scripts

| Command | Where | Purpose |
|---------|--------|---------|
| `npm run dev` | `frontend/` | Dev server + migrate |
| `npm run build` / `npm start` | `frontend/` | Production build / run |
| `node scripts/render-build.cjs` | `frontend/` | Render-style build (see `DEPLOY-RENDER.md`) |

## Features (high level)

- Register / login, guest session, **Discover** / **Following** / **My posts** feeds  
- **Follow** / unfollow, per-user profile pages  
- Likes, threaded comments (WebSocket), live SSE for new posts  
- Optional AI: **Summarize with AI**, **Enhance with AI** (requires `OPENAI_API_KEY` — set in root `.env` for Python and in `frontend/.env` if used by Next routes)  
- RSS **Live headlines** demo when FastAPI + `NEXT_PUBLIC_FASTAPI_SSE_ORIGIN` are set  

## Deployment

The hosted app runs on **Render** — web: [web-svc-mini-linkedin-ai.onrender.com](https://web-svc-mini-linkedin-ai.onrender.com). See **[DEPLOY-RENDER.md](./DEPLOY-RENDER.md)** for the blueprint (`render.yaml`), env vars, Postgres, FastAPI **CORS**, and troubleshooting. Production API URLs are also referenced in `frontend/.env.production` (public host only — no secrets).

## Notes

- **One browser = one signed-in account** (shared cookie). See `frontend/SESSION-NOTES.md` for multi-tab behavior and testing tips.
- **Admin / demo**: optional DB reset UI when `ALLOW_DB_RESET=true` (keep off in production).

## License

ISC (see `frontend/package.json`). Treat as a **portfolio / demo** project.
