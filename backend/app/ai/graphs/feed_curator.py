import asyncio
import json
import os
from typing import Any, Dict, List, Literal, Optional, TypedDict

from langgraph.graph import END, StateGraph

from ..openai_client import generate_text
from ...db.postgres import fetch_posts
from asyncpg import Pool

# How many times each LLM node may run (1 initial try + retries via graph loop).
_DEFAULT_TRIES = 4


def _graph_llm_tries() -> int:
    raw = os.environ.get("LANGGRAPH_LLM_TRIES", str(_DEFAULT_TRIES)).strip()
    try:
        return max(1, min(8, int(raw)))
    except ValueError:
        return _DEFAULT_TRIES


class FeedCuratorState(TypedDict, total=False):
    user_id: Optional[int]
    posts: List[Dict[str, Any]]
    topics: List[str]
    scored_posts: List[Dict[str, Any]]
    summary: str
    actions: str
    # Per-stage failure counts for LangGraph retry loops (increment on each failed attempt).
    topics_failures: int
    summary_failures: int
    actions_failures: int


def _parse_topics(raw: str) -> List[str]:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(x) for x in parsed][:8]
    except Exception:
        pass

    parts = []
    for line in raw.replace("\r", "\n").split("\n"):
        line = line.strip()
        if not line:
            continue
        parts.extend([p.strip() for p in line.split(",") if p.strip()])
    return parts[:8]


def _score_post(post: Dict[str, Any], topics: List[str]) -> float:
    content = str(post.get("content", "")).lower()
    likes_count = float(post.get("likes_count") or 0)
    liked_by_me = bool(post.get("liked_by_me"))

    score = 0.0
    for t in topics:
        tl = t.lower()
        if not tl:
            continue
        if tl in content:
            score += 2.0
        elif any(word in content for word in tl.split()):
            score += 0.5

    score += min(likes_count / 10.0, 3.0)
    if liked_by_me:
        score += 1.5
    return score


def _summary_looks_ok(text: str) -> bool:
    t = text.strip().lower()
    return len(t) > 24 and "top trend" in t


def _actions_look_ok(text: str) -> bool:
    t = text.strip().lower()
    return len(t) > 12 and "suggested" in t


async def _backoff_before_retry(failures_so_far: int) -> None:
    """failures_so_far is count after increment; first retry uses ~1s."""
    if failures_so_far <= 0:
        return
    delay = min(2 ** (failures_so_far - 1), 10.0)
    await asyncio.sleep(delay)


def build_feed_curator_graph(pool: Pool):
    max_tries = _graph_llm_tries()

    async def fetch_posts_node(state: FeedCuratorState) -> FeedCuratorState:
        user_id = state.get("user_id")
        posts = await fetch_posts(pool, user_id=user_id, limit=25)
        return {
            **state,
            "posts": posts,
            "topics_failures": 0,
            "summary_failures": 0,
            "actions_failures": 0,
        }

    async def analyze_topics_node(state: FeedCuratorState) -> FeedCuratorState:
        failures = int(state.get("topics_failures") or 0)
        await _backoff_before_retry(failures)

        posts = state.get("posts") or []
        joined = "\n\n".join([f"- {p['content']}" for p in posts[:15]])
        prompt = (
            "Analyze the topics in the following LinkedIn posts.\n"
            "Return ONLY a JSON array of 5-8 short topic strings.\n\n"
            f"{joined}"
        )

        try:
            raw = await generate_text(prompt=prompt, temperature=0.2, max_attempts=1)
            topics = _parse_topics(raw)
            if topics:
                return {**state, "topics": topics, "topics_failures": 0}
            new_fail = failures + 1
            return {**state, "topics": [], "topics_failures": new_fail}
        except Exception:
            new_fail = failures + 1
            return {**state, "topics": state.get("topics") or [], "topics_failures": new_fail}

    def route_after_topics(state: FeedCuratorState) -> Literal["continue", "retry"]:
        if state.get("topics"):
            return "continue"
        if int(state.get("topics_failures") or 0) < max_tries:
            return "retry"
        return "continue"

    async def score_posts_node(state: FeedCuratorState) -> FeedCuratorState:
        posts = state.get("posts") or []
        topics = state.get("topics") or []

        scored = []
        for p in posts:
            scored.append({**p, "score": _score_post(p, topics)})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return {**state, "scored_posts": scored[:10]}

    async def summarize_feed_node(state: FeedCuratorState) -> FeedCuratorState:
        failures = int(state.get("summary_failures") or 0)
        await _backoff_before_retry(failures)

        topics = state.get("topics") or []
        scored = state.get("scored_posts") or []
        top_snippets = "\n".join(
            [f"- ({s.get('user_name')}) {s.get('content')}" for s in scored[:5]]
        )
        prompt = (
            "You are summarizing a user's LinkedIn feed.\n"
            f"Topics: {', '.join(topics) or '(none)'}\n\n"
            f"Top posts:\n{top_snippets}\n\n"
            "Write exactly 2 lines:\n"
            "Line1 must start with 'Top trend: '.\n"
            "Line2 must start with 'You engage most with '.\n"
            "Keep each line under 12 words."
        )

        try:
            summary = (
                await generate_text(prompt=prompt, temperature=0.3, max_attempts=1)
            ).strip()
            if _summary_looks_ok(summary):
                return {**state, "summary": summary, "summary_failures": 0}
            new_fail = failures + 1
            return {**state, "summary": summary or "", "summary_failures": new_fail}
        except Exception:
            new_fail = failures + 1
            return {**state, "summary": state.get("summary") or "", "summary_failures": new_fail}

    def route_after_summary(state: FeedCuratorState) -> Literal["continue", "retry"]:
        if _summary_looks_ok(state.get("summary") or ""):
            return "continue"
        if int(state.get("summary_failures") or 0) < max_tries:
            return "retry"
        return "continue"

    async def suggest_actions_node(state: FeedCuratorState) -> FeedCuratorState:
        failures = int(state.get("actions_failures") or 0)
        await _backoff_before_retry(failures)

        summary = state.get("summary") or ""
        scored = state.get("scored_posts") or []
        hint = "\n".join([s.get("content") for s in scored[:5] if s.get("content")])[:1500]
        prompt = (
            "Based on the following feed summary and top posts, suggest 1-2 actions "
            "(follow/engage with specific roles or tech areas).\n\n"
            f"Summary:\n{summary}\n\n"
            f"Top post snippets:\n{hint}\n\n"
            "Respond with exactly one line that starts with 'Suggested: '."
        )

        try:
            actions = (
                await generate_text(prompt=prompt, temperature=0.4, max_attempts=1)
            ).strip()
            if _actions_look_ok(actions):
                return {**state, "actions": actions, "actions_failures": 0}
            new_fail = failures + 1
            return {**state, "actions": actions or "", "actions_failures": new_fail}
        except Exception:
            new_fail = failures + 1
            return {**state, "actions": state.get("actions") or "", "actions_failures": new_fail}

    def route_after_actions(state: FeedCuratorState) -> Literal["continue", "retry"]:
        if _actions_look_ok(state.get("actions") or ""):
            return "continue"
        if int(state.get("actions_failures") or 0) < max_tries:
            return "retry"
        return "continue"

    graph = StateGraph(FeedCuratorState)
    graph.add_node("fetch_posts", fetch_posts_node)
    graph.add_node("analyze_topics", analyze_topics_node)
    graph.add_node("score_posts", score_posts_node)
    graph.add_node("summarize_feed", summarize_feed_node)
    graph.add_node("suggest_actions", suggest_actions_node)

    graph.set_entry_point("fetch_posts")
    graph.add_edge("fetch_posts", "analyze_topics")
    graph.add_conditional_edges(
        "analyze_topics",
        route_after_topics,
        {"continue": "score_posts", "retry": "analyze_topics"},
    )
    graph.add_edge("score_posts", "summarize_feed")
    graph.add_conditional_edges(
        "summarize_feed",
        route_after_summary,
        {"continue": "suggest_actions", "retry": "summarize_feed"},
    )
    graph.add_conditional_edges(
        "suggest_actions",
        route_after_actions,
        {"continue": END, "retry": "suggest_actions"},
    )

    return graph.compile()


async def run_feed_curator(pool: Pool, *, user_id: Optional[int]) -> str:
    graph = build_feed_curator_graph(pool)
    result = await graph.ainvoke({"user_id": user_id})
    summary = result.get("summary", "").strip()
    actions = result.get("actions", "").strip()
    if summary and actions:
        return f"{summary}\n{actions}"
    return summary or actions or ""
