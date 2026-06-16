"""User use-cases (api.md §9.6) — public profile and self-update."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.models import Skill, User


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
