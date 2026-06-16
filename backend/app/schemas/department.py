"""Department schemas (api.md §9.7)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class DepartmentRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str


class DepartmentOut(DepartmentRef):
    pass


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = Field(default=None, max_length=80)


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    slug: str | None = Field(default=None, max_length=80)
