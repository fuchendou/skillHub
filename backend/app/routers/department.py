"""Department routes — /department (api.md §9.7)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import parse_page_params
from app.core.responses import data_envelope, paged_envelope
from app.db.session import get_session
from app.deps.auth import get_current_user, require_admin
from app.schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate
from app.services import department_service

router = APIRouter(tags=["department"])


@router.get("/department")
async def list_departments(session: AsyncSession = Depends(get_session), page: int = 1, limit: int = 50):
    params = parse_page_params(page, limit)
    rows, total = await department_service.list_departments(session, params)
    return paged_envelope([DepartmentOut.model_validate(d) for d in rows], total, params)


@router.get("/department/{id_or_slug}")
async def get_department(
    id_or_slug: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_user),
):
    dept = await department_service.get_department(session, id_or_slug)
    return data_envelope(DepartmentOut.model_validate(dept))


@router.post("/department", status_code=201)
async def create_department(
    body: DepartmentCreate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    dept = await department_service.create_department(session, body)
    return data_envelope(DepartmentOut.model_validate(dept))


@router.patch("/department/{id_or_slug}")
async def update_department(
    id_or_slug: str,
    body: DepartmentUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    dept = await department_service.update_department(session, id_or_slug, body)
    return data_envelope(DepartmentOut.model_validate(dept))


@router.delete("/department/{id_or_slug}", status_code=204)
async def delete_department(
    id_or_slug: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    await department_service.delete_department(session, id_or_slug)
    return Response(status_code=204)
