"""Lifecycle state machine, idempotency, and the permission matrix (api.md §9.3, §10)."""
from __future__ import annotations

from tests.conftest import auth, skill_payload


async def _submit(client, creator, category, **overrides) -> str:
    r = await client.post("/api/v1/skill", json=skill_payload(category.id, **overrides), headers=auth(creator))
    assert r.status_code == 201
    return r.json()["data"]["id"]


async def test_publish_makes_visible_and_sets_published_at(client, creator, admin, category):
    sid = await _submit(client, creator, category)
    r = await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "published"
    assert r.json()["data"]["published_at"] is not None
    assert (await client.get("/api/v1/skill")).json()["pagination"]["total"] == 1


async def test_creator_cannot_publish(client, creator, category):
    sid = await _submit(client, creator, category)
    r = await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(creator))
    assert r.status_code == 403 and r.json()["error"]["code"] == "FORBIDDEN_ROLE"


async def test_reject_requires_reason_then_stores_it(client, creator, admin, category):
    sid = await _submit(client, creator, category)
    bad = await client.post(f"/api/v1/skill/{sid}/reject", json={"reason": ""}, headers=auth(admin))
    assert bad.status_code == 400  # empty reason → VALIDATION_ERROR / MISSING_REJECTION_REASON

    ok = await client.post(f"/api/v1/skill/{sid}/reject", json={"reason": "Likely duplicate."}, headers=auth(admin))
    assert ok.status_code == 200
    assert ok.json()["data"]["status"] == "rejected"
    assert ok.json()["data"]["rejection_reason"] == "Likely duplicate."


async def test_rejected_then_resubmit_clears_reason(client, creator, admin, category):
    sid = await _submit(client, creator, category)
    await client.post(f"/api/v1/skill/{sid}/reject", json={"reason": "Fix the source link."}, headers=auth(admin))
    r = await client.post(f"/api/v1/skill/{sid}/resubmit", headers=auth(creator))
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "pending"
    assert r.json()["data"]["rejection_reason"] is None


async def test_feature_requires_published(client, creator, admin, category):
    sid = await _submit(client, creator, category)  # still pending
    r = await client.post(f"/api/v1/skill/{sid}/feature", headers=auth(admin))
    assert r.status_code == 409 and r.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


async def test_feature_and_unfeature(client, creator, admin, category):
    sid = await _submit(client, creator, category)
    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))
    assert (await client.post(f"/api/v1/skill/{sid}/feature", headers=auth(admin))).json()["data"]["is_featured"] is True
    assert (await client.delete(f"/api/v1/skill/{sid}/feature", headers=auth(admin))).json()["data"]["is_featured"] is False


async def test_double_publish_is_idempotent_one_action(client, creator, admin, category):
    sid = await _submit(client, creator, category)
    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))
    r2 = await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))  # double-click
    assert r2.status_code == 200 and r2.json()["data"]["status"] == "published"

    log = await client.get(f"/api/v1/skill/{sid}/review-action", headers=auth(admin))
    actions = [a["action"] for a in log.json()["data"]]
    assert actions.count("publish") == 1  # the no-op did not append a second review_action
    assert "submit" in actions


async def test_idempotency_key_replays_result(client, creator, admin, category):
    sid = await _submit(client, creator, category)
    await client.post(f"/api/v1/skill/{sid}/publish", headers=auth(admin))
    await client.post(f"/api/v1/skill/{sid}/unpublish", headers=auth(admin))
    headers = {**auth(admin), "Idempotency-Key": "replay-123"}
    first = await client.post(f"/api/v1/skill/{sid}/publish", headers=headers)
    second = await client.post(f"/api/v1/skill/{sid}/publish", headers=headers)  # same key
    assert first.json()["data"]["status"] == second.json()["data"]["status"] == "published"
    log = await client.get(f"/api/v1/skill/{sid}/review-action", headers=auth(admin))
    assert [a["action"] for a in log.json()["data"]].count("publish") == 2  # initial + replayed-once


async def test_creator_cannot_edit_others_skill(client, creator, other_creator, category):
    sid = await _submit(client, creator, category)
    r = await client.patch(f"/api/v1/skill/{sid}", json={"summary": "hijack attempt over ten chars"}, headers=auth(other_creator))
    assert r.status_code == 403 and r.json()["error"]["code"] == "NOT_OWNER"


async def test_owner_can_edit_rejected_skill(client, creator, admin, category):
    sid = await _submit(client, creator, category)
    await client.post(f"/api/v1/skill/{sid}/reject", json={"reason": "needs work"}, headers=auth(admin))
    r = await client.patch(f"/api/v1/skill/{sid}", json={"summary": "Improved summary over ten chars."}, headers=auth(creator))
    assert r.status_code == 200 and r.json()["data"]["summary"] == "Improved summary over ten chars."
