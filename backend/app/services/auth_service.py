"""Auth use-cases: register, login, refresh (api.md §9.1)."""
from __future__ import annotations

import jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors, security
from app.core.config import settings
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services import support


async def register(session: AsyncSession, data: RegisterRequest) -> User:
    existing = (await session.execute(select(User).where(User.email == data.email))).scalars().first()
    if existing:
        raise errors.duplicate("EMAIL_ALREADY_EXISTS", "This email is already registered.")
    user = User(
        email=data.email,
        password_hash=security.hash_password(data.password),
        display_name=data.display_name,
        role="creator",
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
    return issue_tokens(user)


async def refresh(session: AsyncSession, refresh_token: str) -> dict:
    try:
        claims = security.decode_token(refresh_token)
    except jwt.ExpiredSignatureError:
        raise errors.token_expired()
    except jwt.PyJWTError:
        raise errors.unauthenticated("Invalid refresh token.")
    if claims.get("type") != "refresh":
        raise errors.unauthenticated("Invalid token type.")
    user = await session.get(User, claims.get("sub"))
    if user is None or not user.is_active:
        raise errors.unauthenticated("Unknown or inactive user.")
    return issue_tokens(user)


def issue_tokens(user: User) -> dict:
    role = support.role_str(user.role)
    return {
        "access_token": security.make_access_token(user.id, role),
        "refresh_token": security.make_refresh_token(user.id),
        "token_type": "Bearer",
        "expires_in": settings.access_token_ttl_seconds,
        "user": user,
    }
