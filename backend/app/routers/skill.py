"""Skill routes — /skill (api.md §9.2)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import parse_page_params
from app.core.responses import data_envelope, paged_envelope
from app.db.session import get_session
from app.deps.auth import optional_user, require_creator
from app.deps.idempotency import idempotency_key
from app.models import User
from app.schemas.skill import SkillCreate, SkillOut, SkillUpdate
from app.services import skill_service

router = APIRouter(tags=["skill"])


def _gate_status(status: str | None, owner: str | None, user: User | None) -> str | None:
    """Apply the api.md §9.2 status visibility gate before it reaches the query."""
    if user is not None and user.role == "admin":
        return status  # admins may request any status (incl. None / "all")
    if user is not None and owner == "me":
        return status  # creators may filter their own submissions by status
    return "published"  # visitors, and creators browsing the public catalog


@router.get("/skill")
async def list_skills(
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
    page: int = 1,
    limit: int = 20,
    q: str | None = None,
    category: str | None = None,
    tag: str | None = None,
    featured: bool | None = None,
    sort: str = Query("newest", pattern="^(newest|name|featured)$"),
    status: str | None = None,
    owner: str | None = None,
):
    params = parse_page_params(page, limit)
    rows, total = await skill_service.list_skills(
        session,
        user=user,
        params=params,
        q=q,
        category=category,
        tag=tag,
        featured=featured,
        status=_gate_status(status, owner, user),
        owner=owner,
        sort=sort,
    )
    return paged_envelope([SkillOut.model_validate(s) for s in rows], total, params)


@router.get("/skill/{id_or_slug}")
async def get_skill(
    id_or_slug: str,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
):
    skill = await skill_service.get_skill_visible(session, id_or_slug, user)
    return data_envelope(SkillOut.model_validate(skill))


@router.post("/skill", status_code=201)
async def create_skill(
    body: SkillCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_creator),
    key: str | None = Depends(idempotency_key),
):
    skill = await skill_service.create_skill(session, body, user, idempotency_key=key)
    return data_envelope(SkillOut.model_validate(skill))


@router.patch("/skill/{skill_id}")
async def update_skill(
    skill_id: str,
    body: SkillUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_creator),
):
    skill = await skill_service.update_skill(session, skill_id, body, user)
    return data_envelope(SkillOut.model_validate(skill))


@router.delete("/skill/{skill_id}", status_code=204)
async def delete_skill(
    skill_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_creator),
):
    await skill_service.delete_skill(session, skill_id, user)
    return Response(status_code=204)
