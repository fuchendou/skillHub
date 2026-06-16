"""User use-cases (api.md §9.6) — public profile and self-update."""
from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.pagination import PageParams
from app.models import Department, Skill, User


async def public_profile(session: AsyncSession, user_id: str) -> tuple[User, int]:
    user = await session.get(User, user_id)
    if user is None:
        raise errors.not_found("USER_NOT_FOUND", "No user with that id.")
    count = (
        await session.execute(
            select(func.count(Skill.id)).where(Skill.owner_id == user.id, Skill.status == "published")
        )
    ).scalar_one()
    return user, count


async def update_me(session: AsyncSession, user: User, data) -> User:
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.bio is not None:
        user.bio = data.bio
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    await session.commit()
    await session.refresh(user)
    return user


async def list_users(
    session: AsyncSession,
    params: PageParams,
    *,
    role: str | None = None,
    department: str | None = None,
    q: str | None = None,
) -> tuple[list[User], int]:
    stmt = select(User).order_by(User.created_at.desc())
    if role:
        stmt = stmt.where(User.role == role)
    if department:
        stmt = stmt.join(Department, Department.id == User.department_id).where(Department.slug == department)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(User.email).like(like), func.lower(User.display_name).like(like)))
    total = (await session.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(params.limit).offset(params.offset))).scalars().unique().all()
    return list(rows), total


async def admin_update_user(session: AsyncSession, user_id: str, data) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise errors.not_found("USER_NOT_FOUND", "No user with that id.")

    fields = data.model_fields_set
    current_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    next_role = data.role if "role" in fields and data.role is not None else current_role
    next_department_id = user.department_id
    if "department_id" in fields:
        next_department_id = data.department_id

    if next_department_id is not None:
        department = await session.get(Department, next_department_id)
        if department is None:
            raise errors.not_found("DEPARTMENT_NOT_FOUND", "No department with that id.")

    if next_role == "member" and next_department_id is None:
        raise errors.validation_error([{"field": "department_id", "message": "Members require a department."}])

    if "role" in fields and data.role is not None:
        user.role = data.role
    if "department_id" in fields:
        user.department_id = next_department_id
    if "is_active" in fields and data.is_active is not None:
        user.is_active = data.is_active

    await session.commit()
    await session.refresh(user)
    return user
