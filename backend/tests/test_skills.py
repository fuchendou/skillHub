"""Skill submission, validation, visibility, and search (api.md §9.2, spec.md §5/§6)."""
from __future__ import annotations

import pytest

from tests.conftest import auth, is_postgres, skill_payload


async def test_submit_enters_pending_and_is_hidden_from_visitors(client, creator, category):
    r = await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(creator))
    assert r.status_code == 201
    body = r.json()["data"]
    assert body["status"] == "pending"
    assert [t["slug"] for t in body["tag"]] == ["database"]  # singular "tag" key (api.md §9.2)

    # visitor catalog excludes the pending skill
    r = await client.get("/api/v1/skill")
    assert r.json()["pagination"]["total"] == 0

    # owner sees it via owner=me
    r = await client.get("/api/v1/skill?owner=me&status=all", headers=auth(creator))
    assert r.json()["pagination"]["total"] == 1


async def test_duplicate_name_and_source_blocked(client, creator, category):
    assert (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(creator))).status_code == 201

    dup_name = await client.post("/api/v1/skill", json=skill_payload(category.id, source_url="github.com/x/y"), headers=auth(creator))
    assert dup_name.status_code == 409 and dup_name.json()["error"]["code"] == "DUPLICATE_SKILL_NAME"

    dup_src = await client.post("/api/v1/skill", json=skill_payload(category.id, name="Different Name"), headers=auth(creator))
    assert dup_src.status_code == 409 and dup_src.json()["error"]["code"] == "DUPLICATE_SOURCE_URL"


async def test_invalid_install_command(client, creator, category):
    r = await client.post(
        "/api/v1/skill",
        json=skill_payload(category.id, install_command="pip install evil"),
        headers=auth(creator),
    )
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_INSTALL_COMMAND"


async def test_unknown_category(client, creator):
    r = await client.post("/api/v1/skill", json=skill_payload("00000000-0000-0000-0000-000000000000"), headers=auth(creator))
    assert r.status_code == 404 and r.json()["error"]["code"] == "CATEGORY_NOT_FOUND"


async def test_get_published_by_slug_and_404_for_hidden(client, creator, admin, category):
    sid = (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(creator))).json()["data"]["id"]

    # pending → visitor gets 404 (not 403), no leak (api.md §9.2)
    r = await client.get(f"/api/v1/skill/{sid}")
    assert r.status_code == 404 and r.json()["error"]["code"] == "SKILL_NOT_FOUND"

    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))
    r = await client.get("/api/v1/skill/schema-drift-watcher")  # by slug
    assert r.status_code == 200 and r.json()["data"]["status"] == "published"


@pytest.mark.skipif(not is_postgres(), reason="full-text search requires Postgres")
async def test_keyword_search(client, creator, admin, category):
    sid = (await client.post("/api/v1/skill", json=skill_payload(category.id), headers=auth(creator))).json()["data"]["id"]
    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))
    r = await client.get("/api/v1/skill?q=drift")
    assert r.json()["pagination"]["total"] == 1
    r = await client.get("/api/v1/skill?q=nonexistentterm")
    assert r.json()["pagination"]["total"] == 0
