# Deploy on Render (demo)

This app is **three pieces**: PostgreSQL, **FastAPI** (`backend/`), and **Next.js + custom server** (`frontend/` — WebSockets on the same process).

## What you need

- A [Render](https://render.com) account (GitHub-connected repo is easiest).
- An **OpenAI API key** if you want AI summarize / enhance (set on the **API** service).

## Production API URL (Next.js)

The repo includes **`frontend/.env.production`** with public URLs for  
`https://pythonapiserver-mini-linkedin-ai.onrender.com` (no secrets).  
The custom server loads it in **production** so `FASTAPI_BASE_URL` works at runtime, not only at build.  
Change that file (or override env in the Render dashboard) if your API host changes.

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
- **Build command**: `node scripts/render-build.cjs`  
  (or manually: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` — **`DATABASE_URL` must be set** or migrate will fail)
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

### `RuntimeError: Missing DATABASE_URL` (Python / FastAPI)

The **API web service** must have **`DATABASE_URL`** in its **Environment** tab at runtime. If it’s missing, startup fails before uvicorn serves traffic.

**Fix:**

1. Open [Render Dashboard](https://dashboard.render.com) → your **PostgreSQL** instance.
2. Copy **Internal Database URL** (preferred if API and DB are on Render in the same region) or **External Database URL**.
3. Open your **FastAPI** web service → **Environment** → **Add environment variable**:
   - **Key:** `DATABASE_URL`  
   - **Value:** paste the URL (must be the full `postgresql://…` string).

**Or** use Render’s **database link**: on the API service, find **Connected databases** / **Link database** (wording varies) and attach your Postgres — Render will inject `DATABASE_URL` automatically.

If you used a **Blueprint**, confirm the deploy actually created the database and that the API service still lists `DATABASE_URL` (Blueprint sync can miss if the DB was deleted or renamed). Re-link or paste the URL manually.

Then **Save** and **Manual Deploy** → **Deploy latest commit**.

- **DB / Prisma (Next.js)**: The **frontend** web service must have **`DATABASE_URL`** in **Environment** (same Postgres as the API). It is used at **build time** (`prisma migrate deploy` in the build command) and at runtime. If it’s missing, the build fails or migrations can’t run. Link the database to that service or paste **Internal Database URL** from the Postgres dashboard.
- **CORS / SSE**: `CORS_ORIGINS` on FastAPI must include the **browser origin** of the Next app (`https://…onrender.com`).
- **asyncpg / SSL**: If the API crashes on DB connect, try appending `?ssl=true` or use Render’s documented SSL parameters for external URLs.
- **Secrets**: Never commit `.env`; set variables only in Render.
