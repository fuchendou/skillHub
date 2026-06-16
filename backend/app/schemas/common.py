"""Shared response envelopes (api.md §5) and the pagination object (api.md §7)."""
from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Envelope(BaseModel, Generic[T]):
    """Single-resource success envelope: ``{ "data": ... }``."""

    data: T


class Pagination(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int


class PagedEnvelope(BaseModel, Generic[T]):
    """Collection success envelope: ``{ "data": [...], "pagination": {...} }``."""

    data: list[T]
    pagination: Pagination
