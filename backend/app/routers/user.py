"""User routes — /user (api.md §9.6).

``/user/me`` and ``/user/me/skill`` are declared before ``/user/{id}`` so "me" is never
captured as an id.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import parse_page_params
from app.core.responses import data_envelope, paged_envelope
from app.db.session import get_session
from app.deps.auth import require_admin, require_member
from app.models import User
from app.schemas.skill import SkillOut
from app.schemas.user import UserAdminOut, UserAdminUpdate, UserPublic, UserUpdate
from app.services import skill_service, user_service

router = APIRouter(tags=["user"])


@router.patch("/user/me")
async def update_me(
    body: UserUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_member),
):
    updated = await user_service.update_me(session, user, body)
    return data_envelope(UserPublic.model_validate(updated))


@router.get("/user/me/skill")
async def my_skills(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_member),
    page: int = 1,
    limit: int = 20,
):
    """Convenience alias for GET /skill?owner=me — the caller's submissions, all statuses."""
    params = parse_page_params(page, limit)
    rows, total = await skill_service.list_skills(
        session, user=user, params=params, owner="me", status="all"
    )
    return paged_envelope([SkillOut.model_validate(s) for s in rows], total, params)


@router.get("/user")
async def list_users(
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
    page: int = 1,
    limit: int = 20,
    role: str | None = Query(default=None, pattern="^(member|admin)$"),
    department: str | None = None,
    q: str | None = None,
):
    params = parse_page_params(page, limit)
    rows, total = await user_service.list_users(session, params, role=role, department=department, q=q)
    return paged_envelope([UserAdminOut.model_validate(u) for u in rows], total, params)


@router.patch("/user/{user_id}")
async def admin_update_user(
    user_id: str,
    body: UserAdminUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    user = await user_service.admin_update_user(session, user_id, body)
    return data_envelope(UserAdminOut.model_validate(user))


@router.get("/user/{user_id}")
async def public_profile(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_member),
):
    user, count = await user_service.public_profile(session, user_id)
    profile = UserPublic.model_validate(user)
    profile.published_skill_count = count
    return data_envelope(profile)
