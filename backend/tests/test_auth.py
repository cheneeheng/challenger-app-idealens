from datetime import UTC, datetime, timedelta

from jose import jwt

from app.core.config import get_settings


async def test_register_returns_token_and_sets_cookie(client):
    resp = await client.post(
        "/auth/register", json={"email": "new@example.com", "password": "password123"}
    )
    assert resp.status_code == 201
    assert resp.json()["access_token"]
    assert "refresh_token" in resp.cookies


async def test_register_duplicate_email_conflicts(client):
    body = {"email": "dup@example.com", "password": "password123"}
    await client.post("/auth/register", json=body)
    resp = await client.post("/auth/register", json=body)
    assert resp.status_code == 409


async def test_login_success(client):
    body = {"email": "login@example.com", "password": "password123"}
    await client.post("/auth/register", json=body)
    resp = await client.post("/auth/login", json=body)
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_login_wrong_password(client):
    body = {"email": "login2@example.com", "password": "password123"}
    await client.post("/auth/register", json=body)
    resp = await client.post(
        "/auth/login", json={"email": "login2@example.com", "password": "wrong"}
    )
    assert resp.status_code == 401


async def test_refresh_rotates_token(client):
    await client.post(
        "/auth/register", json={"email": "ref@example.com", "password": "password123"}
    )
    resp = await client.post("/auth/refresh")
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_refresh_without_cookie_unauthorized(client):
    resp = await client.post("/auth/refresh")
    assert resp.status_code == 401


async def test_logout_revokes_and_clears(client):
    await client.post(
        "/auth/register", json={"email": "out@example.com", "password": "password123"}
    )
    resp = await client.post("/auth/logout")
    assert resp.status_code == 204
    # Subsequent refresh with the revoked token fails.
    refresh = await client.post("/auth/refresh")
    assert refresh.status_code == 401


async def test_expired_access_token_rejected(client):
    settings = get_settings()
    expired = jwt.encode(
        {"sub": "00000000-0000-0000-0000-000000000000", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401


async def test_token_for_deleted_user_rejected(client):
    resp = await client.post(
        "/auth/register", json={"email": "gone@example.com", "password": "password123"}
    )
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    await client.request(
        "DELETE", "/api/users/me", json={"password": "password123"}, headers=headers
    )
    resp = await client.get("/api/users/me", headers=headers)
    assert resp.status_code == 401
