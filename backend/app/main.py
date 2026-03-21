from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.db.postgres import create_pg_pool
from app.routers.ai import router as ai_router
from app.routers.posts_stream import router as posts_stream_router

root_dir = Path(__file__).resolve().parents[2]
load_dotenv(root_dir / '.env')

app = FastAPI(title="Mini-LinkedIn AI (FastAPI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(posts_stream_router)


@app.on_event("startup")
async def _startup() -> None:
    app.state.pg_pool = await create_pg_pool()


@app.on_event("shutdown")
async def _shutdown() -> None:
    pool = getattr(app.state, "pg_pool", None)
    if pool is not None:
        await pool.close()

