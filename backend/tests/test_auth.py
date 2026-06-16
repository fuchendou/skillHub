"""Auth endpoints + the visitor/creator/admin tiers (api.md §9.1, §3)."""
from __future__ import annotations

from tests.conftest import auth, skill_payload


async def test_register_login_me_flow(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "Mina@Example.com", "password": "s3cret-pass", "display_name": "Mina Torres"},
    )
    assert r.status_code == 201
    assert r.json()["data"]["email"] == "mina@example.com"  # normalized lowercase
    assert r.json()["data"]["role"] == "creator"

    r = await client.post("/api/v1/auth/login", json={"email": "mina@example.com", "password": "s3cret-pass"})
    assert r.status_code == 200
    tokens = r.json()["data"]
    assert tokens["token_type"] == "Bearer" and tokens["expires_in"] == 900

    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200
    assert r.json()["data"]["email"] == "mina@example.com"
    assert "password_hash" not in r.json()["data"]


async def test_register_rejects_duplicate_email(client):
    body = {"email": "dup@example.com", "password": "s3cret-pass", "display_name": "Dup"}
    assert (await client.post("/api/v1/auth/register", json=body)).status_code == 201
    r = await client.post("/api/v1/auth/register", json=body)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


async def test_login_bad_credentials(client):
    r = await client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_validation_error_shape(client):
    r = await client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "short"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(r.json()["error"]["details"], list) and r.json()["error"]["details"]


async def test_me_requires_auth(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


async def test_visitor_cannot_submit(client, category):
    r = await client.post("/api/v1/skill", json=skill_payload(category.id))
    assert r.status_code == 401  # no token → UNAUTHENTICATED (api.md §10)
