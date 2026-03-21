import asyncio
import os
import random
from typing import Optional

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)


def _get_client() -> AsyncOpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY")
    return AsyncOpenAI(api_key=api_key)


def _retryable(exc: BaseException) -> bool:
    if isinstance(exc, (APIConnectionError, APITimeoutError, RateLimitError)):
        return True
    if isinstance(exc, APIStatusError):
        code = getattr(exc, "status_code", None)
        if code == 429:
            return True
        if code is not None and code >= 500:
            return True
    return False


async def generate_text(
    *,
    prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_attempts: Optional[int] = None,
) -> str:
    """
    Chat completion with retries on transient OpenAI / network errors.

    Retries: connection issues, timeouts, rate limits (429), and 5xx responses.
    Does not retry other 4xx (bad request, auth, etc.).

    ``max_attempts`` defaults to env ``OPENAI_MAX_ATTEMPTS`` or 4.
    Backoff: exponential + small jitter, capped at 12s between tries.
    """
    client = _get_client()
    chosen_model = model or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"

    attempts = max_attempts
    if attempts is None:
        raw = os.environ.get("OPENAI_MAX_ATTEMPTS", "4").strip()
        try:
            attempts = max(1, min(10, int(raw)))
        except ValueError:
            attempts = 4

    last_error: Optional[BaseException] = None

    for attempt in range(attempts):
        try:
            resp = await client.chat.completions.create(
                model=chosen_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
            )
            content = resp.choices[0].message.content
            return content or ""
        except Exception as exc:
            last_error = exc
            if not _retryable(exc):
                raise
            if attempt >= attempts - 1:
                raise
            base = 2**attempt
            jitter = random.uniform(0, 0.35)
            delay = min(base + jitter, 12.0)
            await asyncio.sleep(delay)

    if last_error:
        raise last_error
    raise RuntimeError("OpenAI generate_text failed without response")
