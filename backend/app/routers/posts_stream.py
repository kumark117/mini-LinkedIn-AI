"""
Server-Sent Events hub for new posts: one asyncio.Queue per connected browser.
Next.js (and HeartBeat) POSTs to /internal/broadcast-post to fan out.
"""

import asyncio
import json
import os
from typing import AsyncIterator, List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from starlette.responses import StreamingResponse

router = APIRouter(tags=["stream"])

_queues: List[asyncio.Queue[bytes]] = []
_lock = asyncio.Lock()
# Last news payload (full SSE frame) sent to new subscribers immediately for demo UX.
_last_news_frame: Optional[bytes] = None
# Same payload as dict — used by GET /api/news/demo and for JSON round-trip without re-parsing SSE.
_last_news_payload: Optional[dict] = None


def get_last_news_payload() -> Optional[dict]:
    return _last_news_payload


class PostBroadcastBody(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: str
    author_username: Optional[str] = None


async def _register_queue() -> asyncio.Queue[bytes]:
    q: asyncio.Queue[bytes] = asyncio.Queue(maxsize=128)
    async with _lock:
        _queues.append(q)
    return q


async def _unregister_queue(q: asyncio.Queue[bytes]) -> None:
    async with _lock:
        try:
            _queues.remove(q)
        except ValueError:
            pass


async def broadcast_news_to_sse_clients(payload: dict) -> None:
    """Push `event: news` (demo RSS headlines) to all SSE clients."""
    global _last_news_frame, _last_news_payload
    _last_news_payload = payload
    line = f"event: news\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
    encoded = line.encode("utf-8")
    _last_news_frame = encoded
    async with _lock:
        targets = list(_queues)
    for q in targets:
        try:
            q.put_nowait(encoded)
        except asyncio.QueueFull:
            pass


async def broadcast_post_to_sse_clients(payload: dict) -> None:
    line = f"event: post\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
    encoded = line.encode("utf-8")
    async with _lock:
        targets = list(_queues)
    for q in targets:
        try:
            q.put_nowait(encoded)
        except asyncio.QueueFull:
            pass


async def _sse_generator(request: Request, q: asyncio.Queue[bytes]) -> AsyncIterator[str]:
    snap = _last_news_frame
    if snap:
        yield snap.decode("utf-8")
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                chunk = await asyncio.wait_for(q.get(), timeout=20.0)
                yield chunk.decode("utf-8")
            except asyncio.TimeoutError:
                yield ": ping\n\n"
    finally:
        await _unregister_queue(q)


@router.get("/api/stream/posts")
async def stream_posts(request: Request) -> StreamingResponse:
    q = await _register_queue()
    return StreamingResponse(
        _sse_generator(request, q),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/internal/broadcast-post")
async def internal_broadcast_post(
    body: PostBroadcastBody,
    x_broadcast_secret: Optional[str] = Header(None, alias="X-Broadcast-Secret"),
) -> dict:
    secret = os.environ.get("SSE_BROADCAST_SECRET", "").strip()
    if secret and x_broadcast_secret != secret:
        raise HTTPException(status_code=403, detail="Invalid broadcast secret")
    await broadcast_post_to_sse_clients(body.model_dump())
    return {"ok": True}
