"""Tag use-cases (api.md §9.5)."""
from __future__ import annotations

from slugify import slugify
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.pagination import PageParams
from app.models import Tag
from app.services import support


async def list_tags(session: AsyncSession, params: PageParams, q: str | None = None) -> tuple[list[Tag], int]:
    stmt = select(Tag).order_by(Tag.name.asc())
    if q:
        stmt = stmt.where(func.lower(Tag.name).like(f"{q.lower()}%"))  # prefix search (api.md §9.5)
    total = (await session.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(params.limit).offset(params.offset))).scalars().all()
    return list(rows), total


async def get_tag(session: AsyncSession, id_or_slug: str) -> Tag:
    tag = (
        await session.execute(select(Tag).where(or_(Tag.id == id_or_slug, Tag.slug == id_or_slug)))
    ).scalars().first()
    if tag is None:
        raise errors.not_found("TAG_NOT_FOUND", "No tag with that id or slug.")
    return tag


async def create_tag(session: AsyncSession, data) -> Tag:
    slug = slugify(data.slug or data.name)
    if (await session.execute(select(Tag.id).where(Tag.slug == slug))).first():
        raise errors.validation_error([{"field": "slug", "message": "Slug already exists."}])
    if (await session.execute(select(Tag.id).where(func.lower(Tag.name) == data.name.lower()))).first():
        raise errors.validation_error([{"field": "name", "message": "Name already exists."}])
    tag = Tag(name=data.name, slug=slug)
    session.add(tag)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    await session.refresh(tag)
    return tag


async def delete_tag(session: AsyncSession, id_or_slug: str) -> None:
    tag = await get_tag(session, id_or_slug)
    await session.delete(tag)  # skill_tag links cascade (schema.md)
    await session.commit()
