"""Tag schemas (api.md §9.5)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TagRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str


# In v1, the public tag shape is identical to the embed.
TagOut = TagRef


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    slug: str | None = Field(default=None, max_length=50)
