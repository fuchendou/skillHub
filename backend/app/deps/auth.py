"""Auth dependencies — the unauthenticated / member / admin tiers from api.md §3.

Each protected endpoint declares its tier inline via ``Depends(...)``, matching the
**Auth** column of api.md §9.
"""
from __future__ import annotations

import jwt
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors, security
from app.db.session import get_session
from app.models import User


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


async def optional_user(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    """Public-route helper: returns ``None`` for missing/invalid tokens — never raises."""
    token = _extract_bearer(authorization)
    if not token:
        return None
    try:
        claims = security.decode_token(token)
    except jwt.PyJWTError:
        return None
    if claims.get("type") != "access":
        return None
    user = await session.get(User, claims.get("sub"))
    if user is None or not user.is_active:
        return None
    return user


async def get_current_user(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> User:
    """member / admin tier: a missing or expired token raises 401."""
    token = _extract_bearer(authorization)
    if not token:
        raise errors.unauthenticated()
    try:
        claims = security.decode_token(token)
    except jwt.ExpiredSignatureError:
        raise errors.token_expired()
    except jwt.PyJWTError:
        raise errors.unauthenticated("Invalid token.")
    if claims.get("type") != "access":
        raise errors.unauthenticated("Invalid token type.")
    user = await session.get(User, claims.get("sub"))
    if user is None or not user.is_active:
        raise errors.unauthenticated("Unknown or inactive user.")
    return user


def require_role(*roles: str):
    """Factory producing a dependency that enforces one of ``roles`` (else 403 FORBIDDEN_ROLE)."""

    async def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:  # UserRole is a str-enum, compares equal to the plain string
            raise errors.forbidden_role()
        return user

    return _dep


require_admin = require_role("admin")
require_member = require_role("member", "admin")
