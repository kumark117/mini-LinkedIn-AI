import os
from typing import Optional

from openai import AsyncOpenAI


def _get_client() -> AsyncOpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY")
    return AsyncOpenAI(api_key=api_key)


async def generate_text(
    *,
    prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.3
) -> str:
    client = _get_client()
    chosen_model = model or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"

    resp = await client.chat.completions.create(
        model=chosen_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )

    content = resp.choices[0].message.content
    return content or ""

