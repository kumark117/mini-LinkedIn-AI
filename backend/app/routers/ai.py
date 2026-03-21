from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.ai.openai_client import generate_text
from app.ai.graphs.feed_curator import run_feed_curator

router = APIRouter()


class EnhanceRequest(BaseModel):
    input: str


class EnhanceResponse(BaseModel):
    output: str


class SummarizeRequest(BaseModel):
    user_id: Optional[int] = None


class SummarizeResponse(BaseModel):
    output: str


@router.post("/ai/enhance", response_model=EnhanceResponse)
async def enhance(req: EnhanceRequest) -> EnhanceResponse:
    prompt = f"Rewrite this LinkedIn post in a professional tone: {req.input}"
    output = await generate_text(prompt=prompt, temperature=0.3)
    return EnhanceResponse(output=output.strip())


@router.post("/ai/summarize", response_model=SummarizeResponse)
async def summarize(request: Request, req: SummarizeRequest) -> SummarizeResponse:
    pool = request.app.state.pg_pool
    output = await run_feed_curator(pool, user_id=req.user_id)
    return SummarizeResponse(output=output)

