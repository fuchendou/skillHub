"""User routes — /user (api.md §9.6).

``/user/me`` and ``/user/me/skill`` are declared before ``/user/{id}`` so "me" is never
captured as an id.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import parse_page_params
from app.core.responses import data_envelope, paged_envelope
from app.db.session import get_session
from app.deps.auth import require_creator
from app.models import User
from app.schemas.skill import SkillOut
from app.schemas.user import UserPublic, UserUpdate
from app.services import skill_service, user_service

router = APIRouter(tags=["user"])


@router.patch("/user/me")
async def update_me(
    body: UserUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_creator),
):
    updated = await user_service.update_me(session, user, body)
    return data_envelope(UserPublic.model_validate(updated))


@router.get("/user/me/skill")
async def my_skills(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_creator),
    page: int = 1,
    limit: int = 20,
):
    """Convenience alias for GET /skill?owner=me — the caller's submissions, all statuses."""
    params = parse_page_params(page, limit)
    rows, total = await skill_service.list_skills(
        session, user=user, params=params, owner="me", status="all"
    )
    return paged_envelope([SkillOut.model_validate(s) for s in rows], total, params)


@router.get("/user/{user_id}")
async def public_profile(user_id: str, session: AsyncSession = Depends(get_session)):
    user, count = await user_service.public_profile(session, user_id)
    profile = UserPublic.model_validate(user)
    profile.published_skill_count = count
    return data_envelope(profile)
