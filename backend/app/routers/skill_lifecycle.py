"""Skill lifecycle routes — /skill/{id}/… (api.md §9.3). Admin-only except resubmit (owner)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.pagination import parse_page_params
from app.core.responses import data_envelope, paged_envelope
from app.db.session import get_session
from app.deps.auth import require_admin, require_creator
from app.deps.idempotency import idempotency_key
from app.models import User
from app.repositories import skill_repository as skill_repo
from app.schemas.skill import RejectRequest, ReviewActionOut, SkillOut
from app.services import review_service

router = APIRouter(tags=["skill-lifecycle"])


@router.post("/skill/{skill_id}/publish")
async def publish(
    skill_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_admin),
    key: str | None = Depends(idempotency_key),
):
    skill = await review_service.publish(session, skill_id, user, idempotency_key=key)
    return data_envelope(SkillOut.model_validate(skill))


@router.post("/skill/{skill_id}/reject")
async def reject(
    skill_id: str,
    body: RejectRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_admin),
    key: str | None = Depends(idempotency_key),
):
    skill = await review_service.reject(session, skill_id, user, body.reason, idempotency_key=key)
    return data_envelope(SkillOut.model_validate(skill))


@router.post("/skill/{skill_id}/feature")
async def feature(
    skill_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_admin),
    key: str | None = Depends(idempotency_key),
):
    skill = await review_service.feature(session, skill_id, user, idempotency_key=key)
    return data_envelope(SkillOut.model_validate(skill))


@router.delete("/skill/{skill_id}/feature")
async def unfeature(
    skill_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_admin),
    key: str | None = Depends(idempotency_key),
):
    skill = await review_service.unfeature(session, skill_id, user, idempotency_key=key)
    return data_envelope(SkillOut.model_validate(skill))


@router.post("/skill/{skill_id}/unpublish")
async def unpublish(
    skill_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_admin),
    key: str | None = Depends(idempotency_key),
):
    skill = await review_service.unpublish(session, skill_id, user, idempotency_key=key)
    return data_envelope(SkillOut.model_validate(skill))


@router.post("/skill/{skill_id}/resubmit")
async def resubmit(
    skill_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_creator),
    key: str | None = Depends(idempotency_key),
):
    skill = await review_service.resubmit(session, skill_id, user, idempotency_key=key)
    return data_envelope(SkillOut.model_validate(skill))


@router.get("/skill/{skill_id}/review-action")
async def review_actions(
    skill_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_creator),
    page: int = 1,
    limit: int = 20,
):
    skill = await skill_repo.get_loaded(session, skill_id)
    if skill is None:
        raise errors.not_found("SKILL_NOT_FOUND", "No skill with that id.")
    if user.role != "admin" and skill.owner_id != user.id:
        raise errors.not_owner()
    params = parse_page_params(page, limit)
    rows, total = await review_service.list_actions(session, skill_id, params)
    return paged_envelope([ReviewActionOut.model_validate(r) for r in rows], total, params)
