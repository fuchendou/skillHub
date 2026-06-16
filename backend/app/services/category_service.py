"""Category use-cases (api.md §9.4). Delete is guarded by the schema.md RESTRICT rule."""
from __future__ import annotations

from slugify import slugify
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.pagination import PageParams
from app.models import Category, Skill
from app.services import support


async def list_categories(session: AsyncSession, params: PageParams) -> tuple[list[Category], int]:
    stmt = select(Category).order_by(Category.sort_order.asc(), Category.name.asc())
    total = (await session.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(params.limit).offset(params.offset))).scalars().all()
    return list(rows), total


async def get_category(session: AsyncSession, id_or_slug: str) -> Category:
    cat = (
        await session.execute(select(Category).where(or_(Category.id == id_or_slug, Category.slug == id_or_slug)))
    ).scalars().first()
    if cat is None:
        raise errors.not_found("CATEGORY_NOT_FOUND", "No category with that id or slug.")
    return cat


async def create_category(session: AsyncSession, data) -> Category:
    slug = slugify(data.slug or data.name)
    if (await session.execute(select(Category.id).where(Category.slug == slug))).first():
        raise errors.validation_error([{"field": "slug", "message": "Slug already exists."}])
    if (await session.execute(select(Category.id).where(func.lower(Category.name) == data.name.lower()))).first():
        raise errors.validation_error([{"field": "name", "message": "Name already exists."}])
    cat = Category(name=data.name, slug=slug, description=data.description, sort_order=data.sort_order)
    session.add(cat)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    await session.refresh(cat)
    return cat


async def update_category(session: AsyncSession, id_or_slug: str, data) -> Category:
    cat = await get_category(session, id_or_slug)
    if data.name is not None:
        cat.name = data.name
    if data.slug is not None:
        cat.slug = slugify(data.slug)
    if data.description is not None:
        cat.description = data.description
    if data.sort_order is not None:
        cat.sort_order = data.sort_order
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    await session.refresh(cat)
    return cat


async def delete_category(session: AsyncSession, id_or_slug: str) -> None:
    cat = await get_category(session, id_or_slug)
    in_use = (await session.execute(select(Skill.id).where(Skill.category_id == cat.id).limit(1))).first()
    if in_use:
        raise errors.invalid_state_transition("Category is still referenced by one or more skills.")
    await session.delete(cat)
    await session.commit()
