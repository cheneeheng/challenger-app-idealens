from fastapi import APIRouter

from app.core.llm_models import ALLOWED_MODELS

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("")
async def list_models() -> list[dict]:
    return ALLOWED_MODELS
