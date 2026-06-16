"""Cross-service helpers: slugging, enum coercion, integrity-error mapping, idempotency, audit."""
from __future__ import annotations

import enum
from datetime import datetime, timedelta, timezone

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.models import IdempotencyKey, ReviewAction


def role_str(role: object) -> str:
    return role.value if isinstance(role, enum.Enum) else str(role)


def enum_val(v: object) -> object:
    return v.value if isinstance(v, enum.Enum) else v


async def unique_slug(session: AsyncSession, model, base: str, max_len: int = 140) -> str:
    root = (slugify(base) or "item")[:max_len]
    candidate, i = root, 2
    while (await session.execute(select(model.id).where(model.slug == candidate))).first():
        suffix = f"-{i}"
        candidate = f"{root[: max_len - len(suffix)]}{suffix}"
        i += 1
    return candidate


def map_integrity_error(exc: IntegrityError) -> errors.AppError:
    """Best-effort mapping of a unique-violation race to the right api.md §8 code."""
    msg = str(getattr(exc, "orig", exc)).lower()
    if "skill_name_uniq" in msg:
        return errors.duplicate("DUPLICATE_SKILL_NAME", "A skill with this name already exists.")
    if "skill_source_uniq" in msg:
        return errors.duplicate("DUPLICATE_SOURCE_URL", "A skill with this source link already exists.")
    if "department" in msg:
        return errors.validation_error([{"field": "department", "message": "Department already exists."}])
    if "email" in msg:
        return errors.duplicate("EMAIL_ALREADY_EXISTS", "This email is already registered.")
    return errors.AppError("CONFLICT", 409, "A uniqueness conflict occurred. Please retry.")


def record_action(
    session: AsyncSession,
    *,
    skill,
    actor_id: str | None,
    action: str,
    from_status: object,
    to_status: object,
    reason: str | None = None,
) -> None:
    """Append exactly one immutable review_action row."""
    session.add(
        ReviewAction(
            skill_id=skill.id,
            actor_id=actor_id,
            action=action,
            from_status=enum_val(from_status),
            to_status=enum_val(to_status),
            reason=reason,
        )
    )


async def replay(session: AsyncSession, key) -> str | None:
    """Return the affected skill id for a same-user, same-fingerprint retry."""
    if not key:
        return None
    if isinstance(key, str):
        row = await session.get(IdempotencyKey, key)
    else:
        row = (
            await session.execute(
                select(IdempotencyKey).where(IdempotencyKey.user_id == key.user_id, IdempotencyKey.key == key.key)
            )
        ).scalars().first()
    if row is None or row.skill_id is None:
        return None
    if not isinstance(key, str) and row.request_fingerprint != key.request_fingerprint:
        raise errors.idempotency_key_conflict()
    return row.skill_id


async def remember(session: AsyncSession, key, actor_id: str | None, skill_id: str) -> None:
    if not key or isinstance(key, str):
        return
    existing = (
        await session.execute(
            select(IdempotencyKey).where(IdempotencyKey.user_id == key.user_id, IdempotencyKey.key == key.key)
        )
    ).scalars().first()
    if existing is not None:
        if existing.request_fingerprint != key.request_fingerprint:
            raise errors.idempotency_key_conflict()
        return
    session.add(
        IdempotencyKey(
            user_id=key.user_id,
            key=key.key,
            request_fingerprint=key.request_fingerprint,
            response_status=200,
            response_body=None,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            skill_id=skill_id,
        )
    )
