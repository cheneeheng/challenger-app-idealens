import uuid
from types import SimpleNamespace

from app.db.models.message import Message
from app.db.models.session import Session
from app.services import llm_service


# --- fake Anthropic SDK -------------------------------------------------------


class _FakeStream:
    def __init__(self, chunks):
        self._chunks = chunks

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    @property
    def text_stream(self):
        chunks = self._chunks

        async def gen():
            for c in chunks:
                yield c

        return gen()


class _FakeMessages:
    def __init__(self, chunks):
        self._chunks = chunks

    def stream(self, **kwargs):
        return _FakeStream(self._chunks)

    async def create(self, **kwargs):
        return SimpleNamespace(content=[SimpleNamespace(type="text", text="SUMMARY")])


class FakeAnthropic:
    def __init__(self, chunks):
        self.messages = _FakeMessages(chunks)


def _chat_body(sid, **over):
    body = {
        "session_id": sid,
        "message": "analyze this",
        "model": "claude-sonnet-4-6",
        "graph_state": {"nodes": [], "edges": []},
    }
    body.update(over)
    return body


async def _set_key_and_session(client):
    await client.put("/api/users/me/api-key", json={"api_key": "sk-ant-test"})
    resp = await client.post("/api/sessions", json={"idea": "test idea"})
    return resp.json()["id"]


# --- tests --------------------------------------------------------------------


async def test_chat_streams_tokens_actions_done(auth_client, monkeypatch):
    chunks = [
        "<GRAPH_ACTIONS>\n",
        '[{"action":"add","payload":{"id":"root","type":"concept",'
        '"label":"X","content":"c","score":null,"parent_id":null}}]\n',
        "</GRAPH_ACTIONS>\n",
        "Hello prose",
    ]
    monkeypatch.setattr(llm_service, "make_client", lambda api_key: FakeAnthropic(chunks))
    sid = await _set_key_and_session(auth_client)

    resp = await auth_client.post("/api/chat", json=_chat_body(sid))
    assert resp.status_code == 200
    body = resp.text
    assert "event: token" in body
    assert "event: graph_action" in body
    assert "event: done" in body
    assert "root" in body


async def test_chat_missing_api_key_emits_error(auth_client):
    resp_s = await auth_client.post("/api/sessions", json={"idea": "no key"})
    sid = resp_s.json()["id"]
    resp = await auth_client.post("/api/chat", json=_chat_body(sid))
    body = resp.text
    assert "event: error" in body
    assert "Invalid API key" in body
    assert "event: done" in body


async def test_chat_ownership_403(auth_client, client):
    reg = await client.post(
        "/auth/register", json={"email": "u2@example.com", "password": "password123"}
    )
    token2 = reg.json()["access_token"]
    h2 = {"Authorization": f"Bearer {token2}"}
    created = await client.post("/api/sessions", json={"idea": "theirs"}, headers=h2)
    sid = created.json()["id"]

    resp = await auth_client.post("/api/chat", json=_chat_body(sid))
    assert resp.status_code == 403


async def test_chat_reconnection_replay(auth_client, db_session, monkeypatch):
    def _boom(api_key):
        raise AssertionError("LLM must not be called on replay")

    monkeypatch.setattr(llm_service, "make_client", _boom)
    sid = await _set_key_and_session(auth_client)

    msg = Message(
        session_id=uuid.UUID(sid), role="assistant", content="REPLAYED", message_index=0
    )
    db_session.add(msg)
    await db_session.commit()

    resp = await auth_client.post(
        "/api/chat", json=_chat_body(sid), headers={"Last-Event-ID": str(msg.id)}
    )
    body = resp.text
    assert "REPLAYED" in body
    assert "event: done" in body


async def test_chat_triggers_summarization(auth_client, db_session, monkeypatch):
    monkeypatch.setattr(llm_service, "make_client", lambda api_key: FakeAnthropic(["hi"]))
    sid = await _set_key_and_session(auth_client)

    for i in range(21):  # exceed CONTEXT_WINDOW_MAX_MESSAGES (20)
        db_session.add(
            Message(session_id=uuid.UUID(sid), role="user", content=str(i), message_index=i)
        )
    await db_session.commit()

    resp = await auth_client.post("/api/chat", json=_chat_body(sid))
    assert resp.status_code == 200

    session = await db_session.get(Session, uuid.UUID(sid))
    await db_session.refresh(session)
    assert session.context_summary == "SUMMARY"
