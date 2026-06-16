"""Skill request/response schemas (api.md §9.2 / §9.3).

Install-command *format* is intentionally NOT validated here — the service raises the
dedicated ``INVALID_INSTALL_COMMAND`` code (api.md §8) so it is distinguishable from a
generic ``VALIDATION_ERROR``. Pydantic only enforces presence and length.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryRef
from app.schemas.department import DepartmentRef
from app.schemas.tag import TagRef
from app.schemas.user import UserRef


class SkillCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=10, max_length=280)
    category_id: str
    install_command: str = Field(min_length=1, max_length=255)
    source_url: str = Field(min_length=1, max_length=500)
    tags: list[str] = Field(default_factory=list)
    usage_note: str | None = Field(default=None, max_length=5000)
    draft: bool = False


class SkillUpdate(BaseModel):
    summary: str | None = Field(default=None, min_length=10, max_length=280)
    category_id: str | None = None
    install_command: str | None = Field(default=None, min_length=1, max_length=255)
    source_url: str | None = Field(default=None, min_length=1, max_length=500)
    tags: list[str] | None = None
    usage_note: str | None = Field(default=None, max_length=5000)


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class DepartmentAssignmentRequest(BaseModel):
    department_ids: list[str] = Field(default_factory=list)


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    name: str
    slug: str
    summary: str
    status: str
    is_featured: bool
    install_command: str
    source_url: str
    usage_note: str | None = None
    risk_label: str | None = None
    rejection_reason: str | None = None
    category: CategoryRef
    owner: UserRef
    departments: list[DepartmentRef] = Field(default_factory=list)
    tags: list[TagRef] = Field(default_factory=list)
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ReviewActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    action: str
    from_status: str | None = None
    to_status: str | None = None
    reason: str | None = None
    actor: UserRef | None = None
    created_at: datetime
