"""Skill use-cases: create/submit, update, delete, get-with-visibility, list (api.md §9.2).

Install-command format and duplicate name/source checks raise the dedicated api.md §8 codes.
"""
from __future__ import annotations

import re

from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.pagination import PageParams
from app.models import Category, Skill, SkillStatus, Tag
from app.models.skill import INSTALL_COMMAND_REGEX
from app.repositories import skill_repository as skill_repo
from app.services import support

_INSTALL_RE = re.compile(INSTALL_COMMAND_REGEX)


def visible(skill: Skill, user) -> bool:
    if skill.status == "published":
        return True
    if user is None:
        return False
    if user.role == "admin":
        return True
    return skill.owner_id == user.id


async def _ensure_unique_name(session: AsyncSession, name: str, exclude_id: str | None = None) -> None:
    stmt = select(Skill.id).where(func.lower(Skill.name) == name.lower())
    if exclude_id:
        stmt = stmt.where(Skill.id != exclude_id)
    if (await session.execute(stmt)).first():
        raise errors.duplicate("DUPLICATE_SKILL_NAME", "A skill with this name already exists.")


async def _ensure_unique_source(session: AsyncSession, source_url: str, exclude_id: str | None = None) -> None:
    stmt = select(Skill.id).where(func.lower(Skill.source_url) == source_url.lower())
    if exclude_id:
        stmt = stmt.where(Skill.id != exclude_id)
    if (await session.execute(stmt)).first():
        raise errors.duplicate("DUPLICATE_SOURCE_URL", "A skill with this source link already exists.")


async def resolve_tags(session: AsyncSession, raw_tags: list[str]) -> list[Tag]:
    """Map tag slugs to Tag rows, creating unknown slugs on the fly (api.md §9.2)."""
    resolved: dict[str, Tag] = {}
    for raw in raw_tags:
        slug = slugify(raw)
        if not slug or slug in resolved:
            continue
        tag = (await session.execute(select(Tag).where(Tag.slug == slug))).scalars().first()
        if tag is None:
            tag = Tag(name=raw[:40], slug=slug)
            session.add(tag)
            await session.flush()
        resolved[slug] = tag
    return list(resolved.values())


async def create_skill(session: AsyncSession, data, owner, idempotency_key: str | None = None) -> Skill:
    if sid := await support.replay(session, idempotency_key):
        return await skill_repo.get_loaded(session, sid)
    if not _INSTALL_RE.match(data.install_command):
        raise errors.invalid_install_command()
    category = await session.get(Category, data.category_id)
    if category is None:
        raise errors.not_found("CATEGORY_NOT_FOUND", "No category with that id.")
    await _ensure_unique_name(session, data.name)
    await _ensure_unique_source(session, data.source_url)

    slug = await support.unique_slug(session, Skill, data.name, max_len=140)
    tags = await resolve_tags(session, data.tag)
    status = SkillStatus.draft if data.draft else SkillStatus.pending
    skill = Skill(
        name=data.name,
        slug=slug,
        summary=data.summary,
        owner_id=owner.id,
        category_id=category.id,
        status=status,
        install_command=data.install_command,
        source_url=data.source_url,
        usage_note=data.usage_note,
    )
    skill.tags = tags
    session.add(skill)
    await session.flush()
    if not data.draft:
        support.record_action(
            session, skill=skill, actor_id=owner.id, action="submit",
            from_status=None, to_status=SkillStatus.pending,
        )
    await support.remember(session, idempotency_key, owner.id, skill.id)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    return await skill_repo.get_loaded(session, skill.id)


async def update_skill(session: AsyncSession, skill_id: str, data, user) -> Skill:
    skill = await skill_repo.get_loaded(session, skill_id)
    if skill is None:
        raise errors.not_found("SKILL_NOT_FOUND", "No skill with that id.")

    if user.role != "admin":
        if skill.owner_id != user.id:
            raise errors.not_owner()
        if skill.status not in ("draft", "rejected"):
            raise errors.forbidden_role()  # creators may edit only their draft/rejected skills

    if data.install_command is not None:
        if not _INSTALL_RE.match(data.install_command):
            raise errors.invalid_install_command()
        skill.install_command = data.install_command
    if data.source_url is not None:
        await _ensure_unique_source(session, data.source_url, exclude_id=skill.id)
        skill.source_url = data.source_url
    if data.category_id is not None:
        category = await session.get(Category, data.category_id)
        if category is None:
            raise errors.not_found("CATEGORY_NOT_FOUND", "No category with that id.")
        skill.category_id = category.id
    if data.summary is not None:
        skill.summary = data.summary
    if data.usage_note is not None:
        skill.usage_note = data.usage_note
    if data.tag is not None:
        skill.tags = await resolve_tags(session, data.tag)

    support.record_action(
        session, skill=skill, actor_id=user.id, action="edit",
        from_status=skill.status, to_status=skill.status,
    )
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    return await skill_repo.get_loaded(session, skill.id)


async def delete_skill(session: AsyncSession, skill_id: str, user) -> None:
    skill = await skill_repo.get_loaded(session, skill_id)
    if skill is None:
        raise errors.not_found("SKILL_NOT_FOUND", "No skill with that id.")
    if user.role != "admin" and not (skill.owner_id == user.id and skill.status == "draft"):
        raise errors.forbidden_role()
    await session.delete(skill)
    await session.commit()


async def get_skill_visible(session: AsyncSession, id_or_slug: str, user) -> Skill:
    skill = await skill_repo.get_by_id_or_slug(session, id_or_slug)
    if skill is None or not visible(skill, user):
        # 404 (not 403) so non-public rows are not leaked (api.md §9.2)
        raise errors.not_found("SKILL_NOT_FOUND", "No skill with that id or slug.")
    return skill


async def list_skills(session: AsyncSession, *, user, params: PageParams, **filters) -> tuple[list[Skill], int]:
    return await skill_repo.list_skills(session, user=user, params=params, **filters)
