"""Skill lifecycle service — the state machine + idempotency (api.md §9.3, schema.md transitions).

Every accepted action mutates the skill AND appends exactly one ``review_action`` in the same
transaction. Each action is idempotent two ways: a replayed ``Idempotency-Key`` returns the
original result, and an action whose target state already holds is a no-op success (not a 409).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.pagination import PageParams
from app.models import ReviewAction, Skill, SkillStatus
from app.repositories import skill_repository as skill_repo
from app.services import support

# Source statuses each action is legal from (api.md §9.3).
PUBLISHABLE_FROM = {"draft", "pending", "unpublished", "rejected"}
REJECTABLE_FROM = {"pending", "draft"}
RESUBMITTABLE_FROM = {"rejected", "draft"}


async def _load(session: AsyncSession, skill_id: str) -> Skill:
    skill = await skill_repo.get_loaded(session, skill_id)
    if skill is None:
        raise errors.not_found("SKILL_NOT_FOUND", "No skill with that id.")
    return skill


async def _noop(session: AsyncSession, skill: Skill, key: str | None, actor_id: str) -> Skill:
    """Record the idempotency key (if any) and return the skill unchanged — no review_action."""
    await support.remember(session, key, actor_id, skill.id)
    await session.commit()
    return await skill_repo.get_loaded(session, skill.id)


async def _commit(session: AsyncSession, skill: Skill, key: str | None, actor_id: str) -> Skill:
    await support.remember(session, key, actor_id, skill.id)
    await session.commit()
    return await skill_repo.get_loaded(session, skill.id)


async def publish(session: AsyncSession, skill_id: str, actor, idempotency_key: str | None = None) -> Skill:
    if sid := await support.replay(session, idempotency_key):
        return await skill_repo.get_loaded(session, sid)
    skill = await _load(session, skill_id)
    if skill.status == "published":
        return await _noop(session, skill, idempotency_key, actor.id)
    if skill.status not in PUBLISHABLE_FROM:
        raise errors.invalid_state_transition(f"Cannot publish a {support.enum_val(skill.status)} skill.")
    frm = skill.status
    skill.status = SkillStatus.published
    if skill.published_at is None:
        skill.published_at = datetime.now(timezone.utc)
    support.record_action(
        session, skill=skill, actor_id=actor.id, action="publish",
        from_status=frm, to_status=SkillStatus.published,
    )
    return await _commit(session, skill, idempotency_key, actor.id)


async def reject(session: AsyncSession, skill_id: str, actor, reason: str, idempotency_key: str | None = None) -> Skill:
    if sid := await support.replay(session, idempotency_key):
        return await skill_repo.get_loaded(session, sid)
    skill = await _load(session, skill_id)
    if skill.status == "rejected":
        return await _noop(session, skill, idempotency_key, actor.id)
    if skill.status not in REJECTABLE_FROM:
        raise errors.invalid_state_transition(f"Cannot reject a {support.enum_val(skill.status)} skill.")
    if not reason or not reason.strip():
        raise errors.missing_rejection_reason()
    frm = skill.status
    skill.status = SkillStatus.rejected
    skill.rejection_reason = reason.strip()
    skill.is_featured = False
    support.record_action(
        session, skill=skill, actor_id=actor.id, action="reject",
        from_status=frm, to_status=SkillStatus.rejected, reason=reason.strip(),
    )
    return await _commit(session, skill, idempotency_key, actor.id)


async def feature(session: AsyncSession, skill_id: str, actor, idempotency_key: str | None = None) -> Skill:
    if sid := await support.replay(session, idempotency_key):
        return await skill_repo.get_loaded(session, sid)
    skill = await _load(session, skill_id)
    if skill.status != "published":
        raise errors.invalid_state_transition("Only a published skill can be featured.")
    if skill.is_featured:
        return await _noop(session, skill, idempotency_key, actor.id)
    skill.is_featured = True
    support.record_action(
        session, skill=skill, actor_id=actor.id, action="feature",
        from_status=skill.status, to_status=skill.status,
    )
    return await _commit(session, skill, idempotency_key, actor.id)


async def unfeature(session: AsyncSession, skill_id: str, actor, idempotency_key: str | None = None) -> Skill:
    if sid := await support.replay(session, idempotency_key):
        return await skill_repo.get_loaded(session, sid)
    skill = await _load(session, skill_id)
    if not skill.is_featured:
        return await _noop(session, skill, idempotency_key, actor.id)
    skill.is_featured = False
    support.record_action(
        session, skill=skill, actor_id=actor.id, action="unfeature",
        from_status=skill.status, to_status=skill.status,
    )
    return await _commit(session, skill, idempotency_key, actor.id)


async def unpublish(session: AsyncSession, skill_id: str, actor, idempotency_key: str | None = None) -> Skill:
    if sid := await support.replay(session, idempotency_key):
        return await skill_repo.get_loaded(session, sid)
    skill = await _load(session, skill_id)
    if skill.status == "unpublished":
        return await _noop(session, skill, idempotency_key, actor.id)
    if skill.status != "published":
        raise errors.invalid_state_transition(f"Cannot unpublish a {support.enum_val(skill.status)} skill.")
    frm = skill.status
    skill.status = SkillStatus.unpublished
    skill.is_featured = False
    support.record_action(
        session, skill=skill, actor_id=actor.id, action="unpublish",
        from_status=frm, to_status=SkillStatus.unpublished,
    )
    return await _commit(session, skill, idempotency_key, actor.id)


async def resubmit(session: AsyncSession, skill_id: str, actor, idempotency_key: str | None = None) -> Skill:
    if sid := await support.replay(session, idempotency_key):
        return await skill_repo.get_loaded(session, sid)
    skill = await _load(session, skill_id)
    if actor.role != "admin" and skill.owner_id != actor.id:
        raise errors.not_owner()
    if skill.status == "pending":
        return await _noop(session, skill, idempotency_key, actor.id)
    if skill.status not in RESUBMITTABLE_FROM:
        raise errors.invalid_state_transition(f"Cannot resubmit a {support.enum_val(skill.status)} skill.")
    frm = skill.status
    skill.status = SkillStatus.pending
    skill.rejection_reason = None
    support.record_action(
        session, skill=skill, actor_id=actor.id, action="resubmit",
        from_status=frm, to_status=SkillStatus.pending,
    )
    return await _commit(session, skill, idempotency_key, actor.id)


async def list_actions(session: AsyncSession, skill_id: str, params: PageParams) -> tuple[list[ReviewAction], int]:
    stmt = (
        select(ReviewAction)
        .where(ReviewAction.skill_id == skill_id)
        .order_by(ReviewAction.created_at.desc())
    )
    total = (
        await session.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))
    ).scalar_one()
    rows = (await session.execute(stmt.limit(params.limit).offset(params.offset))).scalars().unique().all()
    return list(rows), total
