"""
Poll a public RSS feed and broadcast headlines over SSE (`event: news`) for demos.
Disable with NEWS_DEMO_ENABLED=false.
"""

import asyncio
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import httpx

from app.routers.posts_stream import broadcast_news_to_sse_clients

DEFAULT_RSS_URL = "https://feeds.bbci.co.uk/news/world/rss.xml"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _enabled() -> bool:
    v = os.environ.get("NEWS_DEMO_ENABLED", "true").strip().lower()
    return v not in ("0", "false", "no", "off")


def _interval_sec() -> int:
    raw = os.environ.get("NEWS_DEMO_INTERVAL_SEC", "45").strip()
    try:
        return max(15, min(600, int(raw)))
    except ValueError:
        return 45


async def _fetch_rss_items() -> Tuple[List[Dict[str, str]], str, str]:
    url = os.environ.get("NEWS_DEMO_RSS_URL", DEFAULT_RSS_URL).strip() or DEFAULT_RSS_URL
    label = os.environ.get("NEWS_DEMO_LABEL", "World news").strip() or "World news"

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()

    root = ET.fromstring(r.content)
    items: List[Dict[str, Any]] = []

    channel = root.find("channel")
    if channel is not None:
        item_nodes = channel.findall("item")[:15]
    else:
        item_nodes = root.findall(".//item")[:15]

    for item in item_nodes:
        title_el = item.find("title")
        link_el = item.find("link")
        title = (title_el.text or "").strip() if title_el is not None and title_el.text else ""
        link = (link_el.text or "").strip() if link_el is not None and link_el.text else ""
        if title and link:
            items.append({"title": title, "url": link})

    return items[:10], label, url


async def build_news_payload() -> Dict[str, Any]:
    rows, label, feed_url = await _fetch_rss_items()
    return {
        "items": rows,
        "feed_label": label,
        "feed_url": feed_url,
        "updated_at": _utc_now_iso(),
    }


async def _poll_once() -> None:
    payload = await build_news_payload()
    await broadcast_news_to_sse_clients(payload)


async def snapshot_or_fetch_and_broadcast() -> Dict[str, Any]:
    """Return cached headlines if present; otherwise fetch RSS, broadcast to SSE, return."""
    from app.routers.posts_stream import get_last_news_payload

    cached = get_last_news_payload()
    if cached and len(cached.get("items") or []) > 0:
        return cached
    payload = await build_news_payload()
    await broadcast_news_to_sse_clients(payload)
    return payload


async def get_news_demo_snapshot() -> Dict[str, Any]:
    """Called from GET /api/news and /api/news/demo on the stream router (Swagger)."""
    if not _enabled():
        return {"items": [], "feed_label": "", "feed_url": "", "disabled": True}
    try:
        return await snapshot_or_fetch_and_broadcast()
    except Exception:
        return {"items": [], "feed_label": "", "feed_url": "", "error": "fetch_failed"}


async def _periodic_poll_loop() -> None:
    """Refresh RSS on an interval after the initial startup poll."""
    while True:
        await asyncio.sleep(_interval_sec())
        try:
            await _poll_once()
        except Exception:
            # Demo-only: never crash the app on RSS/network/XML issues
            pass


async def _retry_poll_after_delay(sec: float) -> None:
    await asyncio.sleep(sec)
    try:
        await _poll_once()
    except Exception:
        pass


async def run_news_demo_on_startup() -> None:
    """
    First poll runs during app startup (before Uvicorn serves), so `_last_news_frame`
    is set and new SSE clients get headlines on the first SSE chunk.
    """
    if not _enabled():
        return
    try:
        await _poll_once()
    except Exception:
        # Avoid a long gap if RSS/network failed once at boot
        asyncio.create_task(_retry_poll_after_delay(4.0))
    asyncio.create_task(_periodic_poll_loop())
