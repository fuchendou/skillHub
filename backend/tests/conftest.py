"""Test fixtures.

Tests run against ``TEST_DATABASE_URL`` (default: a throwaway sqlite file). The schema is
created from the model metadata per test for isolation. Point ``TEST_DATABASE_URL`` at a
Postgres URL to additionally exercise the GIN full-text search path.
"""
from __future__ import annotations

import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401 — register tables
from app.core import security
from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.models import Category, User
from app.services.support import role_str

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///./_pytest.db")


def is_postgres() -> bool:
    return TEST_DATABASE_URL.startswith("postgresql")


@pytest_asyncio.fixture
async def sm():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        if is_postgres():
            await conn.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS skill_search_ft ON skill "
                "USING GIN (to_tsvector('english', name || ' ' || summary))"
            )
    maker = async_sessionmaker(engine, expire_on_commit=False)
    yield maker
    await engine.dispose()


@pytest_asyncio.fixture
async def client(sm):
    async def _override():
        async with sm() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def _make_user(sm, email: str, name: str, role: str, password: str = "pw-123456") -> User:
    async with sm() as session:
        user = User(
            email=email, display_name=name, role=role, password_hash=security.hash_password(password)
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def admin(sm) -> User:
    return await _make_user(sm, "admin@test.test", "Admin Ann", "admin")


@pytest_asyncio.fixture
async def creator(sm) -> User:
    return await _make_user(sm, "creator@test.test", "Creator Cleo", "creator")


@pytest_asyncio.fixture
async def other_creator(sm) -> User:
    return await _make_user(sm, "other@test.test", "Other Otto", "creator")


@pytest_asyncio.fixture
async def category(sm) -> Category:
    async with sm() as session:
        cat = Category(name="Backend", slug="backend", sort_order=0)
        session.add(cat)
        await session.commit()
        await session.refresh(cat)
        return cat


def auth(user: User) -> dict:
    token = security.make_access_token(user.id, role_str(user.role))
    return {"Authorization": f"Bearer {token}"}


def skill_payload(category_id: str, **overrides) -> dict:
    body = {
        "name": "Schema Drift Watcher",
        "summary": "Compares migrations with models and flags mismatched fields.",
        "category_id": category_id,
        "install_command": "codex skill install mina/schema-drift-watcher",
        "source_url": "github.com/mina/schema-drift-watcher",
        "tag": ["database"],
    }
    body.update(overrides)
    return body
