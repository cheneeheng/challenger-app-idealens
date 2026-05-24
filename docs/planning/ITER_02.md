---
artifact: ITER_02
status: ready
created: 2026-05-23
scope: Analysis engine — LLM service, SSE chat endpoint, graph action schemas, message persistence, context summarization
sections_changed: [04, 06]
sections_unchanged: [01, 02, 03, 05]
---

# ITER_02 — Analysis Engine

## §01 · Concept
> Unchanged — see SKELETON.md §01

## §02 · Architecture
> Unchanged — see SKELETON.md §02

## §03 · Tech Stack
> Unchanged — see ITER_01.md §03

---

## §04 · Backend

### 1. Graph Action Schemas (`app/schemas/graph.py`)

Define Pydantic models for every action the LLM can emit. These are the canonical types — the frontend mirrors them in Zod (see ITER_05).

```python
from __future__ import annotations
from enum import Enum
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field

class DimensionType(str, Enum):
    concept = "concept"
    requirement = "requirement"
    gap = "gap"
    benefit = "benefit"
    drawback = "drawback"
    feasibility = "feasibility"
    flaw = "flaw"
    alternative = "alternative"
    question = "question"

# Each action is its own top-level model with a fixed Literal on `action`.
# Pydantic v2 uses the `action` field as the discriminator key.

class AddAction(BaseModel):
    action: Literal["add"]
    payload: NodePayload

class UpdateAction(BaseModel):
    action: Literal["update"]
    payload: UpdatePayload

class DeleteAction(BaseModel):
    action: Literal["delete"]
    payload: DeletePayload

class ConnectAction(BaseModel):
    action: Literal["connect"]
    payload: ConnectPayload

# Annotated discriminated union — Pydantic v2 selects the correct model
# by reading the `action` field before attempting payload validation.
GraphAction = Annotated[
    Union[AddAction, UpdateAction, DeleteAction, ConnectAction],
    Field(discriminator="action")
]

# Payload shapes (referenced above, defined here):

class NodePayload(BaseModel):
    id: str
    type: DimensionType
    label: str = Field(max_length=60)
    content: str
    score: float | None = Field(None, ge=0.0, le=10.0)  # feasibility only
    parent_id: str | None = None

class UpdatePayload(BaseModel):
    id: str
    label: str | None = None
    content: str | None = None
    # score is intentionally excluded — manual score edits are persisted
    # via the graph_state JSONB snapshot (saveGraph), not through action payloads.

class DeletePayload(BaseModel):
    id: str

class ConnectPayload(BaseModel):
    source: str
    target: str
    label: str
    type: str
```

Use `TypeAdapter(GraphAction).validate_python(raw)` to parse individual action dicts from the LLM response. Pydantic reads the `action` field first and routes to the correct model — a malformed payload under the wrong action type will raise `ValidationError` cleanly.

### 2. Chat Request Schema (`app/schemas/chat.py`)

```python
class ChatRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(min_length=1, max_length=4000)
    model: str                    # validated against allowed model list
    graph_state: dict             # current graph snapshot from frontend

    @field_validator("model")
    def model_must_be_allowed(cls, v):
        allowed = {"claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-6"}
        if v not in allowed:
            raise ValueError("model not in allowlist")
        return v

    @field_validator("graph_state")
    def graph_size_guard(cls, v):
        nodes = v.get("nodes", [])
        edges = v.get("edges", [])
        if len(nodes) > 200:
            raise ValueError("graph exceeds 200 nodes")
        if len(edges) > 400:
            raise ValueError("graph exceeds 400 edges")
        return v
```

### 3. LLM Service (`app/services/llm_service.py`)

**`build_messages(session, new_user_message) -> list[dict]`**

Construct the messages array to send to Anthropic:
1. If `session.context_summary` exists, inject it as the first user message with prefix `[Context]: `
2. Take the last `CONTEXT_WINDOW_MAX_MESSAGES` messages from the session
3. Convert `role="system"` messages to `role="user"` with prefix `[System]: ` (Anthropic API only accepts `user` and `assistant` roles in the messages array)
4. Append the new user message

> **Gotcha — API role constraints:** The Anthropic messages array only accepts `"user"` and `"assistant"`. Any `"system"` messages stored in the DB must be converted before sending.

**`stream_with_heartbeat(client, messages, model, system_prompt) -> AsyncGenerator`**

Use a shared async queue to compose LLM token streaming with periodic keep-alive pings:

```python
queue: asyncio.Queue[str | None] = asyncio.Queue()

async def producer():
    async with client.messages.stream(...) as stream:
        async for text in stream.text_stream:
            await queue.put(("token", text))
    await queue.put(None)  # sentinel

async def pinger():
    while True:
        await asyncio.sleep(15)
        await queue.put(("ping", ""))

producer_task = asyncio.create_task(producer())
pinger_task = asyncio.create_task(pinger())

while True:
    item = await queue.get()
    if item is None:
        break
    yield item

pinger_task.cancel()
```

> **Gotcha — SSE heartbeat composition:** Don't compose keep-alive with LLM streaming via task cancellation/restart — that pattern loses tokens. The shared queue approach ensures both producers write to the same consumer.

**`parse_llm_response(full_text: str) -> tuple[list[GraphAction], str]`**

Extract the `<GRAPH_ACTIONS>...</GRAPH_ACTIONS>` block. Parse the JSON array inside. Validate each item with `TypeAdapter(GraphAction).validate_python(raw_dict)`. Return `(validated_actions, remaining_text)`. Log and skip any action that raises `ValidationError` — do not crash the stream.

**`summarize_messages(messages: list[Message], client, model) -> str`**

Called when `len(session.messages) > CONTEXT_WINDOW_MAX_MESSAGES`. Use `claude-haiku-4-5-20251001` regardless of the session's selected model (haiku is cheaper for summarization). Prompt: compress the provided messages into a concise summary preserving key decisions, findings, and graph changes. Return the summary string.

**`persist_messages(session_id, user_msg, assistant_msg, db) -> None`**

Insert both messages in a single transaction. Assign `message_index` using `SELECT COALESCE(MAX(message_index), -1) + 1` for the user message, `+2` for the assistant. Both inserts in the same transaction.

> **Gotcha — sequential index under concurrency:** `SELECT MAX + 1` without a row lock allows two concurrent requests to compute the same index. For V1 single-user sessions this is acceptable. Note it as a known limitation to address in a later iteration if needed.

### 4. System Prompt (`app/prompts/analysis_system.py`)

```python
PROMPT_VERSION = "1.0"

SYSTEM_PROMPT = """You are a rigorous analytical assistant. Your purpose is to help users deeply examine and stress-test their ideas — not to validate them.

## Your Role
When a user presents an idea or topic, systematically analyze it across 9 dimensions. Be honest, direct, and constructive. Surface real weaknesses, not sanitized ones.

## Analysis Dimensions
Cover ALL of the following on every initial analysis:
1. **Core Concept** (`concept`) — What is this idea fundamentally about?
2. **Requirements** (`requirement`) — Resources, skills, capital, time, dependencies.
3. **Gaps** (`gap`) — What is unknown, missing, or unresolved?
4. **Benefits** (`benefit`) — Genuine positive outcomes if this succeeds.
5. **Drawbacks** (`drawback`) — Real risks, costs, negative consequences.
6. **Feasibility** (`feasibility`) — Score 0–10. Include clear reasoning.
7. **Flaws** (`flaw`) — Logical inconsistencies, false assumptions, fundamental problems.
8. **Alternatives** (`alternative`) — Other approaches to the same goal.
9. **Open Questions** (`question`) — Unanswered questions that affect the outcome.

## Output Format — MANDATORY
Every response MUST include a <GRAPH_ACTIONS> block first, then your explanation.

<GRAPH_ACTIONS>
[
  {"action": "add", "payload": {"id": "<slug>", "type": "<dimension>", "label": "<max 60 chars>", "content": "<1-3 sentences>", "score": null, "parent_id": null}},
  {"action": "connect", "payload": {"source": "<id>", "target": "<id>", "label": "<relation>", "type": "<relation_type>"}}
]
</GRAPH_ACTIONS>

Your natural language explanation here.

On follow-up messages: use `update` or `add` actions to refine the graph. Do not re-add nodes that already exist unless replacing them.
"""
```

### 5. SSE Chat Endpoint (`app/api/routes/chat.py`)

**POST /api/chat** returns `StreamingResponse` with `Content-Type: text/event-stream`.

Required SSE headers on the response:
```python
headers = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",      # disables nginx proxy buffering
    "Connection": "keep-alive",
}
```

SSE event format (each event is a string yielded from the generator):
```
id: <uuid>\n
event: <type>\n
data: <json string>\n
\n
```

Event types to emit:
| Event | Data | When |
|---|---|---|
| `token` | `{"text": "..."}` | each LLM token |
| `graph_action` | `{"action": "add", "payload": {...}}` | each validated action |
| `ping` | `{}` | every ~15s keep-alive |
| `error` | `{"message": "..."}` | any failure |
| `done` | `{}` | stream complete |

**Endpoint flow:**
1. Validate `ChatRequest` (Pydantic)
2. Load session; verify ownership (403 if not owner)
3. Decrypt user API key; if missing → emit `error` event + `done`, return
4. Check `Last-Event-ID` header — if present and matches a completed assistant message in DB, replay that message's content as tokens then `done` (reconnection support)
5. Check if summarization needed (`len(messages) > CONTEXT_WINDOW_MAX_MESSAGES`) — summarize, update `session.context_summary`
6. Call `build_messages()` → `stream_with_heartbeat()`
7. Accumulate full response text. For each token: emit `token` event. For each ping: emit `ping` event.
8. After stream ends: `parse_llm_response(full_text)` → emit each `graph_action` event
9. Emit `done`
10. `persist_messages()` in background (after response is sent)

**Anthropic error mapping:**
| SDK error | User-facing message |
|---|---|
| 401 | "Invalid API key. Check your key in Settings." |
| 429 | "Rate limit reached. Wait a moment and try again." |
| 529 | "Anthropic is overloaded right now. Try again in a few seconds." |
| Any other | "An error occurred. Please try again." |

### 6. Tests

`tests/test_chat.py` — mock the Anthropic SDK using a fake streaming response:
- Successful stream emits tokens then graph actions then done
- Missing API key → error event
- Ownership check (403)
- Reconnection replay (Last-Event-ID)
- Context summarization triggered when message count exceeds threshold

`tests/test_services.py` — unit test each service function:
- `parse_llm_response`: valid block, malformed JSON, missing block, partial action failure
- `build_messages`: context injection, role conversion, window truncation
- `summarize_messages`: mocked haiku call

---

## §05 · Frontend
> Unchanged — see SKELETON.md §05

---

## §06 · LLM / Prompts

**System prompt:** Defined in ITER_02 §04 above. Stored in `app/prompts/analysis_system.py` as `SYSTEM_PROMPT` constant with a `PROMPT_VERSION` string.

**Context strategy:**
- Keep last `CONTEXT_WINDOW_MAX_MESSAGES` (default: 20) messages verbatim
- When exceeded, summarize all older messages once using Haiku; store summary in `session.context_summary`
- Summary injected as first message with `[Context]: ` prefix on every subsequent request
- Full graph state passed in `ChatRequest.graph_state` on every request (not stored in DB per-message)

**Follow-up behaviour:** On non-initial messages the LLM should use `update` and `add` actions to evolve the existing graph, not rebuild it from scratch. This is enforced by including the current graph state in the prompt context (the system prompt instructs this; no code enforcement needed at this stage).
