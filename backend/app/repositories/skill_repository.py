"""Skill data access: department visibility filtering, filtered listing, and search."""
from __future__ import annotations

from sqlalchemy import Select, and_, func, nullslast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.pagination import PageParams
from app.models import Category, Department, Skill, SkillTag, Tag, User


def is_postgres() -> bool:
    return settings.database_url.startswith("postgresql")


def apply_visibility(stmt: Select, user: User) -> Select:
    if user.role == "admin":  # admin sees everything
        return stmt
    visible_published = and_(
        Skill.status == "published",
        or_(
            ~Skill.departments.any(),
            Skill.departments.any(Department.id == user.department_id),
        ),
    )
    return stmt.where(or_(visible_published, Skill.owner_id == user.id))


def _apply_search(stmt: Select, q: str) -> Select:
    if is_postgres():
        ts = func.to_tsvector("english", Skill.name + " " + Skill.summary)
        return stmt.where(ts.op("@@")(func.plainto_tsquery("english", q)))
    like = f"%{q.lower()}%"
    return stmt.where(or_(func.lower(Skill.name).like(like), func.lower(Skill.summary).like(like)))


async def get_loaded(session: AsyncSession, skill_id: str) -> Skill | None:
    """Fetch one skill by id with owner/category/tags eagerly loaded (safe to serialize)."""
    stmt = select(Skill).where(Skill.id == skill_id)
    return (await session.execute(stmt)).scalars().first()


async def get_by_id_or_slug(session: AsyncSession, value: str) -> Skill | None:
    stmt = select(Skill).where(or_(Skill.id == value, Skill.slug == value))
    return (await session.execute(stmt)).scalars().first()


async def list_skills(
    session: AsyncSession,
    *,
    user: User,
    params: PageParams,
    q: str | None = None,
    category: str | None = None,
    tag: str | None = None,
    featured: bool | None = None,
    status: str | None = None,
    owner: str | None = None,
    sort: str = "newest",
) -> tuple[list[Skill], int]:
    stmt = apply_visibility(select(Skill), user)

    if status and status != "all":
        stmt = stmt.where(Skill.status == status)
    if owner == "me":
        stmt = stmt.where(Skill.owner_id == user.id)
    if category:
        stmt = stmt.where(
            Skill.category_id.in_(select(Category.id).where(Category.slug == category))
        )
    if tag:
        stmt = stmt.where(
            Skill.id.in_(
                select(SkillTag.skill_id)
                .join(Tag, Tag.id == SkillTag.tag_id)
                .where(Tag.slug == tag)
            )
        )
    if featured is not None:
        stmt = stmt.where(Skill.is_featured == featured)
    if q:
        stmt = _apply_search(stmt, q)

    if sort == "name":
        stmt = stmt.order_by(func.lower(Skill.name).asc())
    elif sort == "featured":
        stmt = stmt.order_by(Skill.is_featured.desc(), nullslast(Skill.published_at.desc()))
    else:  # newest (default)
        stmt = stmt.order_by(nullslast(Skill.published_at.desc()), Skill.created_at.desc())

    total = (
        await session.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))
    ).scalar_one()
    rows = (
        (await session.execute(stmt.limit(params.limit).offset(params.offset))).scalars().unique().all()
    )
    return list(rows), total
