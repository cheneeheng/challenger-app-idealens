from types import SimpleNamespace

from app.services import llm_service
from app.services.llm_service import build_messages, parse_llm_response, summarize_messages


# --- parse_llm_response -------------------------------------------------------

VALID_BLOCK = """<GRAPH_ACTIONS>
[{"action": "add", "payload": {"id": "root", "type": "concept", "label": "Idea", "content": "c", "score": null, "parent_id": null}}]
</GRAPH_ACTIONS>
Here is the explanation."""


def test_parse_valid_block():
    actions, prose = parse_llm_response(VALID_BLOCK)
    assert len(actions) == 1
    assert actions[0].action == "add"
    assert prose == "Here is the explanation."


def test_parse_missing_block():
    actions, prose = parse_llm_response("Just prose, no actions.")
    assert actions == []
    assert prose == "Just prose, no actions."


def test_parse_malformed_json():
    text = "<GRAPH_ACTIONS>\n[not json}\n</GRAPH_ACTIONS>\nprose"
    actions, prose = parse_llm_response(text)
    assert actions == []
    assert prose == "prose"


def test_parse_skips_invalid_action():
    text = """<GRAPH_ACTIONS>
[
  {"action": "add", "payload": {"id": "a", "type": "concept", "label": "ok", "content": "c"}},
  {"action": "add", "payload": {"id": "b", "type": "not_a_dimension", "label": "bad", "content": "c"}}
]
</GRAPH_ACTIONS>
prose"""
    actions, _ = parse_llm_response(text)
    assert len(actions) == 1
    assert actions[0].payload.id == "a"


# --- build_messages -----------------------------------------------------------


def _session(summary=None, messages=()):
    return SimpleNamespace(context_summary=summary, messages=list(messages))


def test_build_messages_injects_context_summary():
    session = _session(summary="prior findings")
    out = build_messages(session, "new question")
    assert out[0] == {"role": "user", "content": "[Context]: prior findings"}
    assert out[-1] == {"role": "user", "content": "new question"}


def test_build_messages_converts_system_role():
    session = _session(
        messages=[SimpleNamespace(role="system", content="note")],
    )
    out = build_messages(session, "q")
    assert out[0] == {"role": "user", "content": "[System]: note"}


def test_build_messages_truncates_window():
    msgs = [SimpleNamespace(role="user", content=str(i)) for i in range(50)]
    session = _session(messages=msgs)
    out = build_messages(session, "q")
    # 20 recent (default window) + 1 new message, no context summary
    assert len(out) == 21
    assert out[0]["content"] == "30"


# --- summarize_messages -------------------------------------------------------


class _FakeMessages:
    async def create(self, **kwargs):
        block = SimpleNamespace(type="text", text="SUMMARY")
        return SimpleNamespace(content=[block])


class _FakeClient:
    def __init__(self):
        self.messages = _FakeMessages()


async def test_summarize_messages_uses_client():
    msgs = [SimpleNamespace(role="user", content="hello")]
    result = await summarize_messages(msgs, _FakeClient(), model="claude-haiku-4-5-20251001")
    assert result == "SUMMARY"


def test_user_message_for_error_mapping():
    assert "Invalid API key" in llm_service.user_message_for_error(
        SimpleNamespace(status_code=401)
    )
    assert "Rate limit" in llm_service.user_message_for_error(SimpleNamespace(status_code=429))
    assert "overloaded" in llm_service.user_message_for_error(SimpleNamespace(status_code=529))
    assert "error occurred" in llm_service.user_message_for_error(SimpleNamespace(status_code=500))
