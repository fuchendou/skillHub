"""Pagination helpers — page/limit parsing and the api.md §7 ``pagination`` object."""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


@dataclass(frozen=True)
class PageParams:
    page: int
    limit: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


def parse_page_params(page: int = 1, limit: int = DEFAULT_LIMIT) -> PageParams:
    """Clamp to the api.md §7 ranges: page >= 1, limit in 1..100 (default 20)."""
    page = max(page, 1)
    limit = min(max(limit, 1), MAX_LIMIT)
    return PageParams(page=page, limit=limit)


def build_pagination(total: int, params: PageParams) -> dict[str, int]:
    return {
        "total": total,
        "page": params.page,
        "limit": params.limit,
        "totalPages": ceil(total / params.limit) if params.limit else 0,
    }
