import os
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.db.postgres import create_pg_pool
from app.news_demo import run_news_demo_on_startup
from app.routers.ai import router as ai_router
from app.routers.posts_stream import router as posts_stream_router

root_dir = Path(__file__).resolve().parents[2]
load_dotenv(root_dir / '.env')


def _cors_allow_origins() -> List[str]:
    """Local dev defaults; on Render set CORS_ORIGINS to your Next.js URL (comma-separated)."""
    base = ['http://localhost:3000', 'http://127.0.0.1:3000']
    extra = os.environ.get('CORS_ORIGINS', '').strip()
    if not extra:
        return base
    for part in extra.split(','):
        o = part.strip()
        if o and o not in base:
            base.append(o)
    return base


app = FastAPI(
    title="Mini-LinkedIn AI (FastAPI)",
    openapi_tags=[
        {"name": "News", "description": "RSS headline demo (also pushed over SSE as `event: news`)."},
        {"name": "stream", "description": "Server-Sent Events for new posts."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(posts_stream_router)


@app.get("/", tags=["health"], summary="Root — avoids 404 on probes hitting /")
async def root() -> str:
    return "hello world!"


# Registered on the app (not a sub-router) so /docs always lists these if main.py is loaded.
@app.get(
    "/api/news",
    tags=["News"],
    operation_id="get_live_news_snapshot",
    summary="Live news snapshot (short path)",
)
async def news_snapshot_http() -> Dict[str, Any]:
    from app.news_demo import get_news_demo_snapshot as _snapshot

    return await _snapshot()


@app.get(
    "/api/news/demo",
    tags=["News"],
    operation_id="get_live_news_demo_snapshot",
    summary="Live news snapshot (demo path)",
)
async def news_demo_http() -> Dict[str, Any]:
    from app.news_demo import get_news_demo_snapshot as _snapshot

    return await _snapshot()


@app.on_event("startup")
async def _startup() -> None:
    app.state.pg_pool = await create_pg_pool()
    await run_news_demo_on_startup()


@app.on_event("shutdown")
async def _shutdown() -> None:
    pool = getattr(app.state, "pg_pool", None)
    if pool is not None:
        await pool.close()

