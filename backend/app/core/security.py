"""JWT issuing/verification and argon2 password hashing (api.md §3, schema.md ``password_hash``)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from app.core.config import settings

_ph = PasswordHasher()


# --- Passwords ---
def hash_password(raw: str) -> str:
    return _ph.hash(raw)


def verify_password(raw: str, digest: str) -> bool:
    try:
        return _ph.verify(digest, raw)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


# --- Tokens ---
def _encode(payload: dict[str, Any], ttl_seconds: int) -> str:
    now = datetime.now(timezone.utc)
    body = {**payload, "iat": now, "exp": now + timedelta(seconds=ttl_seconds)}
    return jwt.encode(body, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def make_access_token(user_id: str, role: str) -> str:
    """Short-lived token sent on protected requests. Claims: sub, role, exp."""
    return _encode({"sub": user_id, "role": role, "type": "access"}, settings.access_token_ttl_seconds)


def make_refresh_token(user_id: str) -> str:
    """Long-lived token exchanged at POST /auth/refresh."""
    return _encode({"sub": user_id, "type": "refresh"}, settings.refresh_token_ttl_seconds)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises ``jwt.ExpiredSignatureError`` / ``jwt.PyJWTError``."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
