import os
from typing import Any, Dict, List, Optional

import asyncpg


async def create_pg_pool() -> asyncpg.Pool:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Missing DATABASE_URL")

    # Small pool sizes for a demo.
    return await asyncpg.create_pool(dsn=database_url, min_size=1, max_size=5)


async def fetch_posts(
    pool: asyncpg.Pool,
    *,
    user_id: Optional[int],
    limit: int = 30
) -> List[Dict[str, Any]]:
    query = """
      SELECT
        p.id,
        p.user_id,
        u.name AS user_name,
        p.content,
        p.created_at,
        (
          SELECT COUNT(*)
          FROM likes l
          WHERE l.post_id = p.id
        ) AS likes_count,
        (
          SELECT COUNT(*)
          FROM comments c
          WHERE c.post_id = p.id
        ) AS comments_count,
        CASE
          WHEN $1::int IS NULL THEN FALSE
          ELSE EXISTS (
            SELECT 1
            FROM likes l2
            WHERE l2.user_id = $1 AND l2.post_id = p.id
          )
        END AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT $2
    """

    rows = await pool.fetch(query, user_id, limit)
    return [dict(r) for r in rows]

