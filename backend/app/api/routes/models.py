from fastapi import APIRouter

router = APIRouter(prefix="/api/models", tags=["models"])

# Allowed model identifiers (public). Sonnet is the default.
ALLOWED_MODELS = [
    {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6", "default": True},
    {"id": "claude-haiku-4-5-20251001", "label": "Claude Haiku 4.5", "default": False},
    {"id": "claude-opus-4-8", "label": "Claude Opus 4.8", "default": False},
]


@router.get("")
async def list_models() -> list[dict]:
    return ALLOWED_MODELS
