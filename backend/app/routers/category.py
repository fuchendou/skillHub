"""Category routes — /category (api.md §9.4). Public read; admin write."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import parse_page_params
from app.core.responses import data_envelope, paged_envelope
from app.db.session import get_session
from app.deps.auth import require_admin, require_member
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import category_service

router = APIRouter(tags=["category"])


@router.get("/category")
async def list_categories(
    session: AsyncSession = Depends(get_session),
    _=Depends(require_member),
    page: int = 1,
    limit: int = 20,
):
    params = parse_page_params(page, limit)
    rows, total = await category_service.list_categories(session, params)
    return paged_envelope([CategoryOut.model_validate(c) for c in rows], total, params)


@router.get("/category/{id_or_slug}")
async def get_category(
    id_or_slug: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_member),
):
    cat = await category_service.get_category(session, id_or_slug)
    return data_envelope(CategoryOut.model_validate(cat))


@router.post("/category", status_code=201)
async def create_category(
    body: CategoryCreate, session: AsyncSession = Depends(get_session), _=Depends(require_admin)
):
    cat = await category_service.create_category(session, body)
    return data_envelope(CategoryOut.model_validate(cat))


@router.patch("/category/{category_id}")
async def update_category(
    category_id: str,
    body: CategoryUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    cat = await category_service.update_category(session, category_id, body)
    return data_envelope(CategoryOut.model_validate(cat))


@router.delete("/category/{category_id}", status_code=204)
async def delete_category(
    category_id: str, session: AsyncSession = Depends(get_session), _=Depends(require_admin)
):
    await category_service.delete_category(session, category_id)
    return Response(status_code=204)
