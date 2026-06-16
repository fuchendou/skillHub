"""Build an idempotency context from the optional Idempotency-Key header."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from fastapi import Depends, Header, Request

from app.deps.auth import get_current_user
from app.models import User


@dataclass(frozen=True)
class IdempotencyContext:
    key: str
    user_id: str
    request_fingerprint: str


async def idempotency_key(
    request: Request,
    idempotency_key: str | None = Header(default=None),
    user: User = Depends(get_current_user),
) -> IdempotencyContext | None:
    if not idempotency_key:
        return None
    raw_body = await request.body()
    if raw_body:
        try:
            body = json.dumps(json.loads(raw_body), sort_keys=True, separators=(",", ":"))
        except json.JSONDecodeError:
            body = raw_body.decode("utf-8", errors="replace")
    else:
        body = ""
    fingerprint_src = f"{request.method.upper()} {request.url.path} {body}"
    return IdempotencyContext(
        key=idempotency_key[:80],
        user_id=user.id,
        request_fingerprint=hashlib.sha256(fingerprint_src.encode("utf-8")).hexdigest(),
    )
