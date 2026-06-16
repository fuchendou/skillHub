"""Auth endpoints and the unauthenticated/member/admin tiers (api.md §9.1, §3)."""
from __future__ import annotations

from tests.conftest import skill_payload


async def test_register_login_me_flow(client, department):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "Mina@Example.com",
            "password": "s3cret-pass",
            "display_name": "Mina Torres",
            "department_id": department.id,
        },
    )
    assert r.status_code == 201
    assert r.json()["data"]["email"] == "mina@example.com"
    assert r.json()["data"]["role"] == "member"
    assert r.json()["data"]["department"]["slug"] == "engineering"

    r = await client.post("/api/v1/auth/login", json={"email": "mina@example.com", "password": "s3cret-pass"})
    assert r.status_code == 200
    tokens = r.json()["data"]
    assert tokens["token_type"] == "Bearer" and tokens["expires_in"] == 900
    assert tokens["user"]["role"] == "member"
    assert tokens["user"]["department"]["id"] == department.id

    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200
    assert r.json()["data"]["email"] == "mina@example.com"
    assert r.json()["data"]["department"]["id"] == department.id
    assert "password_hash" not in r.json()["data"]


async def test_register_rejects_duplicate_email(client, department):
    body = {
        "email": "dup@example.com",
        "password": "s3cret-pass",
        "display_name": "Dup",
        "department_id": department.id,
    }
    assert (await client.post("/api/v1/auth/register", json=body)).status_code == 201
    r = await client.post("/api/v1/auth/register", json=body)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


async def test_register_rejects_unknown_department(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@example.com",
            "password": "s3cret-pass",
            "display_name": "New Member",
            "department_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "DEPARTMENT_NOT_FOUND"


async def test_login_bad_credentials(client):
    r = await client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_refresh_token_rotates_and_revokes_previous_token(client, member):
    login = await client.post("/api/v1/auth/login", json={"email": member.email, "password": "pw-123456"})
    assert login.status_code == 200
    first_refresh = login.json()["data"]["refresh_token"]
    assert first_refresh.startswith("rft_")

    refreshed = await client.post("/api/v1/auth/refresh", json={"refresh_token": first_refresh})
    assert refreshed.status_code == 200
    second_refresh = refreshed.json()["data"]["refresh_token"]
    assert second_refresh.startswith("rft_")
    assert second_refresh != first_refresh

    replay_old = await client.post("/api/v1/auth/refresh", json={"refresh_token": first_refresh})
    assert replay_old.status_code == 401
    assert replay_old.json()["error"]["code"] == "UNAUTHENTICATED"


async def test_validation_error_shape(client):
    r = await client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "short"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(r.json()["error"]["details"], list) and r.json()["error"]["details"]


async def test_me_requires_auth(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


async def test_unauthenticated_cannot_read_catalog_or_submit(client, category):
    list_response = await client.get("/api/v1/skill")
    assert list_response.status_code == 401

    create_response = await client.post("/api/v1/skill", json=skill_payload(category.id))
    assert create_response.status_code == 401
