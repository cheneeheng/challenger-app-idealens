async def _register(client, email):
    resp = await client.post("/auth/register", json={"email": email, "password": "password123"})
    return resp.json()["access_token"]


async def test_create_seeds_root_node(auth_client):
    resp = await auth_client.post("/api/sessions", json={"idea": "A flying car for cities"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "A flying car for cities"
    assert body["graph_state"]["nodes"][0]["id"] == "root"
    assert body["messages"] == []


async def test_name_defaults_to_truncated_idea(auth_client):
    idea = "x" * 100
    resp = await auth_client.post("/api/sessions", json={"idea": idea})
    assert resp.json()["name"] == "x" * 60


async def test_list_ordered_and_paginated(auth_client):
    for i in range(3):
        await auth_client.post("/api/sessions", json={"idea": f"idea {i}"})
    resp = await auth_client.get("/api/sessions", params={"page": 1, "page_size": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


async def test_get_update_delete_lifecycle(auth_client):
    created = await auth_client.post("/api/sessions", json={"idea": "lifecycle"})
    sid = created.json()["id"]

    got = await auth_client.get(f"/api/sessions/{sid}")
    assert got.status_code == 200

    patched = await auth_client.patch(f"/api/sessions/{sid}", json={"name": "Renamed"})
    assert patched.json()["name"] == "Renamed"

    deleted = await auth_client.delete(f"/api/sessions/{sid}")
    assert deleted.status_code == 204

    missing = await auth_client.get(f"/api/sessions/{sid}")
    assert missing.status_code == 404


async def test_graph_update_replaces_state(auth_client):
    created = await auth_client.post("/api/sessions", json={"idea": "graph"})
    sid = created.json()["id"]
    new_state = {"nodes": [{"id": "a"}], "edges": []}
    resp = await auth_client.put(f"/api/sessions/{sid}/graph", json={"graph_state": new_state})
    assert resp.status_code == 204
    got = await auth_client.get(f"/api/sessions/{sid}")
    assert got.json()["graph_state"] == new_state


async def test_ownership_returns_403(auth_client, client):
    # auth_client is user1. Create a session as user2.
    token2 = await _register(client, "user2@example.com")
    created = await client.post(
        "/api/sessions",
        json={"idea": "other user idea"},
        headers={"Authorization": f"Bearer {token2}"},
    )
    sid = created.json()["id"]

    resp = await auth_client.get(f"/api/sessions/{sid}")
    assert resp.status_code == 403
