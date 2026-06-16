"""User request/response schemas (api.md §9.6)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.department import DepartmentRef


class UserRef(BaseModel):
    """Lightweight embed used inside skill/review responses."""

    model_config = ConfigDict(from_attributes=True)
    id: str
    display_name: str


class UserPublic(BaseModel):
    """Public profile — never exposes email or password_hash (api.md §9.6)."""

    model_config = ConfigDict(from_attributes=True)
    id: str
    display_name: str
    department: DepartmentRef | None = None
    bio: str | None = None
    avatar_url: str | None = None
    published_skill_count: int = 0


class UserMe(BaseModel):
    """The authenticated user's own record (GET /auth/me)."""

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
    id: str
    email: str
    display_name: str
    role: str
    department: DepartmentRef | None = None
    bio: str | None = None
    avatar_url: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=80)
    bio: str | None = Field(default=None, max_length=280)
    avatar_url: str | None = Field(default=None, max_length=500)


class UserAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
    id: str
    email: str
    display_name: str
    role: str
    department: DepartmentRef | None = None
    is_active: bool
    created_at: datetime


class UserAdminUpdate(BaseModel):
    role: str | None = Field(default=None, pattern="^(member|admin)$")
    department_id: str | None = None
    is_active: bool | None = None
