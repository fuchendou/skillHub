"""Auth routes — /auth (api.md §9.1)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import data_envelope
from app.db.session import get_session
from app.deps.auth import get_current_user
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisteredUser, RegisterRequest, TokenBundle
from app.schemas.user import UserMe
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    user = await auth_service.register(session, body)
    return data_envelope(RegisteredUser.model_validate(user))


@router.post("/login")
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    bundle = await auth_service.login(session, body)
    return data_envelope(TokenBundle.model_validate(bundle))


@router.post("/refresh")
async def refresh(body: RefreshRequest, session: AsyncSession = Depends(get_session)):
    bundle = await auth_service.refresh(session, body.refresh_token)
    return data_envelope(TokenBundle.model_validate(bundle))


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return data_envelope(UserMe.model_validate(user))
