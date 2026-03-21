import json
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, StateGraph

from ..openai_client import generate_text
from ...db.postgres import fetch_posts
from asyncpg import Pool


class FeedCuratorState(TypedDict, total=False):
    user_id: Optional[int]
    posts: List[Dict[str, Any]]
    topics: List[str]
    scored_posts: List[Dict[str, Any]]
    summary: str
    actions: str


def _parse_topics(raw: str) -> List[str]:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(x) for x in parsed][:8]
    except Exception:
        pass

    # Fallback: split by commas/newlines.
    parts = []
    for line in raw.replace('\r', '\n').split('\n'):
        line = line.strip()
        if not line:
            continue
        parts.extend([p.strip() for p in line.split(',') if p.strip()])
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
        # quick heuristic for partial matches
        elif any(word in content for word in tl.split()):
            score += 0.5

    score += min(likes_count / 10.0, 3.0)
    if liked_by_me:
        score += 1.5
    return score


def build_feed_curator_graph(pool: Pool):
    async def fetch_posts_node(state: FeedCuratorState) -> FeedCuratorState:
        user_id = state.get("user_id")
        posts = await fetch_posts(pool, user_id=user_id, limit=25)
        return {**state, "posts": posts}

    async def analyze_topics_node(state: FeedCuratorState) -> FeedCuratorState:
        posts = state.get("posts") or []
        joined = "\n\n".join([f"- {p['content']}" for p in posts[:15]])

        prompt = (
            "Analyze the topics in the following LinkedIn posts.\n"
            "Return ONLY a JSON array of 5-8 short topic strings.\n\n"
            f"{joined}"
        )

        raw = await generate_text(prompt=prompt, temperature=0.2)
        topics = _parse_topics(raw)
        return {**state, "topics": topics}

    async def score_posts_node(state: FeedCuratorState) -> FeedCuratorState:
        posts = state.get("posts") or []
        topics = state.get("topics") or []

        scored = []
        for p in posts:
            scored.append({**p, "score": _score_post(p, topics)})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return {**state, "scored_posts": scored[:10]}

    async def summarize_feed_node(state: FeedCuratorState) -> FeedCuratorState:
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

        summary = await generate_text(prompt=prompt, temperature=0.3)
        return {**state, "summary": summary.strip()}

    async def suggest_actions_node(state: FeedCuratorState) -> FeedCuratorState:
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

        actions = await generate_text(prompt=prompt, temperature=0.4)
        return {**state, "actions": actions.strip()}

    graph = StateGraph(FeedCuratorState)
    graph.add_node("fetch_posts", fetch_posts_node)
    graph.add_node("analyze_topics", analyze_topics_node)
    graph.add_node("score_posts", score_posts_node)
    graph.add_node("summarize_feed", summarize_feed_node)
    graph.add_node("suggest_actions", suggest_actions_node)

    graph.set_entry_point("fetch_posts")
    graph.add_edge("fetch_posts", "analyze_topics")
    graph.add_edge("analyze_topics", "score_posts")
    graph.add_edge("score_posts", "summarize_feed")
    graph.add_edge("summarize_feed", "suggest_actions")
    graph.add_edge("suggest_actions", END)

    return graph.compile()


async def run_feed_curator(pool: Pool, *, user_id: Optional[int]) -> str:
    graph = build_feed_curator_graph(pool)
    result = await graph.ainvoke({"user_id": user_id})
    summary = result.get("summary", "").strip()
    actions = result.get("actions", "").strip()
    if summary and actions:
        return f"{summary}\n{actions}"
    return summary or actions or ""

