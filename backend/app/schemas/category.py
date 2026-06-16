"""Category schemas (api.md §9.4)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CategoryRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    description: str | None = None
    sort_order: int = 0


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    slug: str | None = Field(default=None, max_length=50)
    description: str | None = Field(default=None, max_length=280)
    sort_order: int = Field(default=0, ge=0)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    slug: str | None = Field(default=None, max_length=50)
    description: str | None = Field(default=None, max_length=280)
    sort_order: int | None = Field(default=None, ge=0)
