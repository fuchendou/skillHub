"""Skill submission, validation, department visibility, and search."""
from __future__ import annotations

import pytest

from tests.conftest import auth, is_postgres, skill_payload


async def test_submit_enters_pending_and_owner_can_read_it(client, member, other_member, category):
    r = await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(member))
    assert r.status_code == 201
    body = r.json()["data"]
    assert body["status"] == "pending"
    assert [t["slug"] for t in body["tags"]] == ["database"]

    unauth = await client.get("/api/v1/skill")
    assert unauth.status_code == 401

    owner_view = await client.get("/api/v1/skill?owner=me&status=all", headers=auth(member))
    assert owner_view.json()["pagination"]["total"] == 1

    other_view = await client.get("/api/v1/skill", headers=auth(other_member))
    assert other_view.json()["pagination"]["total"] == 0


async def test_duplicate_name_and_source_blocked(client, member, category):
    assert (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(member))).status_code == 201

    dup_name = await client.post(
        "/api/v1/skill",
        json=skill_payload(category.id, source_url="github.com/x/y"),
        headers=auth(member),
    )
    assert dup_name.status_code == 409 and dup_name.json()["error"]["code"] == "DUPLICATE_SKILL_NAME"

    dup_src = await client.post(
        "/api/v1/skill",
        json=skill_payload(category.id, name="Different Name"),
        headers=auth(member),
    )
    assert dup_src.status_code == 409 and dup_src.json()["error"]["code"] == "DUPLICATE_SOURCE_URL"


async def test_idempotency_key_conflict_for_different_submit_request(client, member, category):
    headers = {**auth(member), "Idempotency-Key": "submit-replay"}
    first = await client.post("/api/v1/skill", json=skill_payload(category.id), headers=headers)
    assert first.status_code == 201

    conflict = await client.post(
        "/api/v1/skill",
        json=skill_payload(
            category.id,
            name="Different Skill",
            source_url="github.com/mina/different-skill",
        ),
        headers=headers,
    )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "IDEMPOTENCY_KEY_CONFLICT"


async def test_invalid_install_command(client, member, category):
    r = await client.post(
        "/api/v1/skill",
        json=skill_payload(category.id, install_command="pip install evil"),
        headers=auth(member),
    )
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_INSTALL_COMMAND"


async def test_unknown_category(client, member):
    r = await client.post(
        "/api/v1/skill",
        json=skill_payload("00000000-0000-0000-0000-000000000000"),
        headers=auth(member),
    )
    assert r.status_code == 404 and r.json()["error"]["code"] == "CATEGORY_NOT_FOUND"


async def test_published_org_wide_skill_visible_to_all_members(client, member, other_member, admin, category):
    sid = (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(member))).json()["data"]["id"]
    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))

    by_slug = await client.get("/api/v1/skill/schema-drift-watcher", headers=auth(other_member))
    assert by_slug.status_code == 200
    assert by_slug.json()["data"]["status"] == "published"
    assert by_slug.json()["data"]["departments"] == []


async def test_department_scoped_skill_hidden_from_other_departments(
    client, member, other_member, admin, category, department
):
    sid = (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(member))).json()["data"]["id"]
    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))

    assign = await client.put(
        f"/api/v1/skill/{sid}/departments",
        json={"department_ids": [department.id]},
        headers=auth(admin),
    )
    assert assign.status_code == 200
    assert [d["slug"] for d in assign.json()["data"]["departments"]] == ["engineering"]

    owner_list = await client.get("/api/v1/skill", headers=auth(member))
    assert owner_list.json()["pagination"]["total"] == 1

    other_list = await client.get("/api/v1/skill", headers=auth(other_member))
    assert other_list.json()["pagination"]["total"] == 0

    hidden_detail = await client.get(f"/api/v1/skill/{sid}", headers=auth(other_member))
    assert hidden_detail.status_code == 404 and hidden_detail.json()["error"]["code"] == "SKILL_NOT_FOUND"


async def test_department_assignment_is_admin_only_and_requires_published(client, member, admin, category, department):
    sid = (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(member))).json()["data"]["id"]

    member_attempt = await client.put(
        f"/api/v1/skill/{sid}/departments",
        json={"department_ids": [department.id]},
        headers=auth(member),
    )
    assert member_attempt.status_code == 403

    pending_attempt = await client.put(
        f"/api/v1/skill/{sid}/departments",
        json={"department_ids": [department.id]},
        headers=auth(admin),
    )
    assert pending_attempt.status_code == 409
    assert pending_attempt.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


@pytest.mark.skipif(not is_postgres(), reason="full-text search requires Postgres")
async def test_keyword_search(client, member, admin, category):
    sid = (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(member))).json()["data"]["id"]
    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))
    r = await client.get("/api/v1/skill?q=drift", headers=auth(member))
    assert r.json()["pagination"]["total"] == 1
    r = await client.get("/api/v1/skill?q=nonexistentterm", headers=auth(member))
    assert r.json()["pagination"]["total"] == 0
