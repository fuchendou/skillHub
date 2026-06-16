"""Auth use-cases: register, login, refresh (api.md §9.1)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors, security
from app.core.config import settings
from app.models import Department, RefreshToken, User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services import support


async def register(session: AsyncSession, data: RegisterRequest) -> User:
    existing = (await session.execute(select(User).where(User.email == data.email))).scalars().first()
    if existing:
        raise errors.duplicate("EMAIL_ALREADY_EXISTS", "This email is already registered.")
    department = await session.get(Department, data.department_id)
    if department is None:
        raise errors.not_found("DEPARTMENT_NOT_FOUND", "No department with that id.")
    user = User(
        email=data.email,
        password_hash=security.hash_password(data.password),
        display_name=data.display_name,
        role="member",
        department_id=department.id,
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise support.map_integrity_error(exc)
    await session.refresh(user)
    return user


async def login(session: AsyncSession, data: LoginRequest) -> dict:
    user = (await session.execute(select(User).where(User.email == data.email))).scalars().first()
    if user is None or not user.is_active or not security.verify_password(data.password, user.password_hash):
        raise errors.invalid_credentials()
    return await issue_tokens(session, user)


async def refresh(session: AsyncSession, refresh_token: str) -> dict:
    token_hash = security.hash_refresh_token(refresh_token)
    row = (await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))).scalars().first()
    if row is None or row.revoked_at is not None:
        raise errors.unauthenticated("Invalid refresh token.")
    now = datetime.now(timezone.utc)
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise errors.token_expired()
    user = await session.get(User, row.user_id)
    if user is None or not user.is_active:
        raise errors.unauthenticated("Unknown or inactive user.")
    row.revoked_at = now
    return await issue_tokens(session, user)


async def issue_tokens(session: AsyncSession, user: User) -> dict:
    role = support.role_str(user.role)
    raw_refresh = security.make_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=security.hash_refresh_token(raw_refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.refresh_token_ttl_seconds),
        )
    )
    await session.commit()
    await session.refresh(user)
    return {
        "access_token": security.make_access_token(user.id, role),
        "refresh_token": raw_refresh,
        "token_type": "Bearer",
        "expires_in": settings.access_token_ttl_seconds,
        "user": user,
    }
