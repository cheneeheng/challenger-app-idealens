async def test_get_me_hides_key(auth_client):
    resp = await auth_client.get("/api/users/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "owner@example.com"
    assert body["has_api_key"] is False
    assert "encrypted_api_key" not in body


async def test_update_display_name(auth_client):
    resp = await auth_client.patch("/api/users/me", json={"display_name": "Ada"})
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Ada"


async def test_update_email_conflict(auth_client, client):
    await client.post(
        "/auth/register", json={"email": "taken@example.com", "password": "password123"}
    )
    resp = await auth_client.patch("/api/users/me", json={"email": "taken@example.com"})
    assert resp.status_code == 409


async def test_change_password_requires_current(auth_client):
    resp = await auth_client.patch(
        "/api/users/me/password",
        json={"current_password": "wrong", "new_password": "newpassword123"},
    )
    assert resp.status_code == 400


async def test_change_password_success(auth_client):
    resp = await auth_client.patch(
        "/api/users/me/password",
        json={"current_password": "password123", "new_password": "newpassword123"},
    )
    assert resp.status_code == 204


async def test_set_api_key_validates_prefix(auth_client):
    bad = await auth_client.put("/api/users/me/api-key", json={"api_key": "nope"})
    assert bad.status_code == 400

    good = await auth_client.put("/api/users/me/api-key", json={"api_key": "sk-ant-abc123"})
    assert good.status_code == 204

    me = await auth_client.get("/api/users/me")
    assert me.json()["has_api_key"] is True


async def test_delete_account_requires_password(auth_client):
    resp = await auth_client.request(
        "DELETE", "/api/users/me", json={"password": "wrong"}
    )
    assert resp.status_code == 400


async def test_routes_require_auth(client):
    resp = await client.get("/api/users/me")
    assert resp.status_code == 401  # missing bearer credentials
