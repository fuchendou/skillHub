"""Tag routes — /tag (api.md §9.5). Public read; admin write."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import parse_page_params
from app.core.responses import data_envelope, paged_envelope
from app.db.session import get_session
from app.deps.auth import require_admin
from app.schemas.tag import TagCreate, TagOut
from app.services import tag_service

router = APIRouter(tags=["tag"])


@router.get("/tag")
async def list_tags(
    session: AsyncSession = Depends(get_session),
    page: int = 1,
    limit: int = 20,
    q: str | None = None,
):
    params = parse_page_params(page, limit)
    rows, total = await tag_service.list_tags(session, params, q=q)
    return paged_envelope([TagOut.model_validate(t) for t in rows], total, params)


@router.get("/tag/{id_or_slug}")
async def get_tag(id_or_slug: str, session: AsyncSession = Depends(get_session)):
    tag = await tag_service.get_tag(session, id_or_slug)
    return data_envelope(TagOut.model_validate(tag))


@router.post("/tag", status_code=201)
async def create_tag(
    body: TagCreate, session: AsyncSession = Depends(get_session), _=Depends(require_admin)
):
    tag = await tag_service.create_tag(session, body)
    return data_envelope(TagOut.model_validate(tag))


@router.delete("/tag/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: str, session: AsyncSession = Depends(get_session), _=Depends(require_admin)
):
    await tag_service.delete_tag(session, tag_id)
    return Response(status_code=204)
