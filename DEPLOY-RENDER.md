# Deploy on Render (demo)

This app is **three pieces**: PostgreSQL, **FastAPI** (`backend/`), and **Next.js + custom server** (`frontend/` — WebSockets on the same process).

## What you need

- A [Render](https://render.com) account (GitHub-connected repo is easiest).
- An **OpenAI API key** if you want AI summarize / enhance (set on the **API** service).

## Option A — Blueprint (IaC)

1. Push this repo to GitHub (including `render.yaml`).
2. In Render: **New** → **Blueprint** → connect the repo.
3. Review services + Postgres, then apply.
4. After the first successful deploy, open the **API** service → **Environment**:
   - Set **`CORS_ORIGINS`** to your **web** service public URL, e.g. `https://mini-linkedin-web.onrender.com`  
     (no trailing slash; add more origins comma-separated if needed).
5. **Redeploy** the API service so CORS picks up the new value.
6. Open the **web** URL in a browser; register or sign in and smoke-test posts, comments, and (if configured) AI features.

If the first web build fails because the API URL was not ready, trigger **Clear build cache & deploy** on the web service after the API is live.

## Option B — Manual (same architecture)

Create resources in this order:

### 1. PostgreSQL

- **New** → **PostgreSQL**, pick a name/region.
- Copy the **Internal** or **External** connection string for apps on Render (often the internal URL is enough for other Render services in the same region).

### 2. Web service — FastAPI

- **New** → **Web Service**, connect repo.
- **Root directory**: `backend`
- **Runtime**: Python
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment**:
  - `DATABASE_URL` — from the Postgres dashboard (link database to the service if Render offers it).
  - `OPENAI_API_KEY` — your key (optional for a bare demo).
  - `CORS_ORIGINS` — your **final** Next.js URL, e.g. `https://<your-web-service>.onrender.com`

Note the service **public URL** (e.g. `https://mini-linkedin-api.onrender.com`) — you need it for the frontend.

### 3. Web service — Next.js

- **New** → **Web Service**, same repo.
- **Root directory**: `frontend`
- **Runtime**: Node
- **Build command**:  
  `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start command**: `npm start`
- **Environment** (minimum):
  - `DATABASE_URL` — same DB as above.
  - `JWT_SECRET` — long random string.
  - `FASTAPI_BASE_URL` — `https://<your-api-service>.onrender.com` (no trailing slash).
  - `NEXT_PUBLIC_FASTAPI_SSE_ORIGIN` — **same** URL as `FASTAPI_BASE_URL` (needed for browser SSE to FastAPI).
  - `ALLOW_DB_RESET` — `false` for anything public.

Then go back and **confirm `CORS_ORIGINS` on the API** matches the **web** URL exactly.

## Free tier caveats

- **Cold starts** — first request after idle can take tens of seconds.
- **WebSockets** (comments) and **SSE** should work on paid web services; if anything flakes on the free tier, treat it as a demo limitation.

## If something breaks

- **DB / Prisma**: Ensure `DATABASE_URL` is set for the **web** build **and** runtime (migrations run at build).
- **CORS / SSE**: `CORS_ORIGINS` on FastAPI must include the **browser origin** of the Next app (`https://…onrender.com`).
- **asyncpg / SSL**: If the API crashes on DB connect, try appending `?ssl=true` or use Render’s documented SSL parameters for external URLs.
- **Secrets**: Never commit `.env`; set variables only in Render.
