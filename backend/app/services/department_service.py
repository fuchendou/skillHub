"""Department use-cases (api.md §9.7)."""
from __future__ import annotations

from slugify import slugify
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.pagination import PageParams
from app.models import Department, SkillDepartment, User
from app.services import support


async def list_departments(session: AsyncSession, params: PageParams) -> tuple[list[Department], int]:
    stmt = select(Department).order_by(Department.name.asc())
    total = (await session.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(params.limit).offset(params.offset))).scalars().all()
    return list(rows), total


async def get_department(session: AsyncSession, id_or_slug: str) -> Department:
    dept = (
        await session.execute(
            select(Department).where(or_(Department.id == id_or_slug, Department.slug == id_or_slug))
        )
    ).scalars().first()
    if dept is None:
        raise errors.not_found("DEPARTMENT_NOT_FOUND", "No department with that id or slug.")
    return dept


async def create_department(session: AsyncSession, data) -> Department:
    slug = slugify(data.slug or data.name)
    if not slug:
        raise errors.validation_error([{"field": "slug", "message": "Slug is required."}])
    dept = Department(name=data.name, slug=slug)
    session.add(dept)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    await session.refresh(dept)
    return dept


async def update_department(session: AsyncSession, id_or_slug: str, data) -> Department:
    dept = await get_department(session, id_or_slug)
    if data.name is not None:
        dept.name = data.name
    if data.slug is not None:
        dept.slug = slugify(data.slug)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    await session.refresh(dept)
    return dept


async def delete_department(session: AsyncSession, id_or_slug: str) -> None:
    dept = await get_department(session, id_or_slug)
    member = (await session.execute(select(User.id).where(User.department_id == dept.id).limit(1))).first()
    scoped_skill = (
        await session.execute(select(SkillDepartment.skill_id).where(SkillDepartment.department_id == dept.id).limit(1))
    ).first()
    if member or scoped_skill:
        raise errors.resource_in_use("Department is still referenced by members or skills.")
    await session.delete(dept)
    await session.commit()
