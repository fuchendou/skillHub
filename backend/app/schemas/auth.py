"""Auth request/response schemas (api.md §9.1)."""
from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(v: str) -> str:
    v = v.strip().lower()
    if not _EMAIL_RE.match(v):
        raise ValueError("A valid email address is required.")
    return v


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=72)
    display_name: str = Field(min_length=2, max_length=80)

    _norm_email = field_validator("email")(_validate_email)


class LoginRequest(BaseModel):
    email: str
    password: str

    _norm_email = field_validator("email")(_validate_email)


class RefreshRequest(BaseModel):
    refresh_token: str


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
    id: str
    display_name: str
    role: str


class RegisteredUser(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
    id: str
    email: str
    display_name: str
    role: str
    created_at: datetime


class TokenBundle(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserBrief
