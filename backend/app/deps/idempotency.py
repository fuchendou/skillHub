"""Extracts the optional ``Idempotency-Key`` header (api.md §4).

The value is threaded into the lifecycle/submit services, which use it together with the
``idempotency_key`` table to replay the original result instead of repeating side effects.
"""
from __future__ import annotations

from fastapi import Header


def idempotency_key(idempotency_key: str | None = Header(default=None)) -> str | None:
    return idempotency_key
