"""Canonical list of selectable Anthropic models.

Single source of truth for the public /api/models endpoint, the session
default, and the chat request allowlist.
"""

ALLOWED_MODELS: list[dict] = [
    {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6", "default": True},
    {"id": "claude-haiku-4-5-20251001", "label": "Claude Haiku 4.5", "default": False},
    {"id": "claude-opus-4-8", "label": "Claude Opus 4.8", "default": False},
]

ALLOWED_MODEL_IDS: frozenset[str] = frozenset(m["id"] for m in ALLOWED_MODELS)

DEFAULT_MODEL: str = next(m["id"] for m in ALLOWED_MODELS if m["default"])

# Cheaper model always used for context summarization, regardless of the
# session's selected model.
SUMMARY_MODEL: str = "claude-haiku-4-5-20251001"
