"""Helpers that render the api.md §5 success envelopes.

Returning plain dicts (already JSON-mode dumped with ``by_alias=True``) guarantees the public
key names from api.md — notably the singular ``tag`` array on a skill.
"""
from __future__ import annotations

from pydantic import BaseModel

from app.core.pagination import PageParams, build_pagination


def data_envelope(model: BaseModel) -> dict:
    return {"data": model.model_dump(mode="json", by_alias=True)}


def paged_envelope(models: list[BaseModel], total: int, params: PageParams) -> dict:
    return {
        "data": [m.model_dump(mode="json", by_alias=True) for m in models],
        "pagination": build_pagination(total, params),
    }
