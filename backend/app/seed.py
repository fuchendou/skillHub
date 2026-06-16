"""Idempotent seed data (implement.md §4.5).

Inserts departments, the controlled category set, a starter tag set, an admin + members, and a few
skills spanning the lifecycle so the catalog and the review queue both render on first run.

Run with:  python -m app.seed
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from slugify import slugify
from sqlalchemy import func, select

import app.models  # noqa: F401
from app.core import security
from app.db.base import SessionLocal
from app.models import Category, Department, Skill, SkillStatus, Tag, User

DEPARTMENTS = ["Engineering", "Design", "Product", "QA", "Docs", "Security"]

CATEGORIES = [
    ("Backend", "Server-side logic, APIs, data, and jobs.", 0),
    ("Design", "UI, UX, and visual systems.", 1),
    ("DevOps", "CI/CD, infrastructure, and operations.", 2),
    ("Testing", "Test generation and quality.", 3),
    ("Docs", "Documentation and technical writing.", 4),
    ("Security", "Security review and hardening.", 5),
    ("Performance", "Profiling and optimization.", 6),
    ("Review", "Code review and static analysis.", 7),
]

TAGS = ["database", "api", "python", "typescript", "ci", "lint", "secrets", "dependencies", "react", "sql"]


async def _get_department(session, slug: str) -> Department | None:
    return (await session.execute(select(Department).where(Department.slug == slug))).scalars().first()


async def _seed_departments(session) -> None:
    for name in DEPARTMENTS:
        slug = slugify(name)
        if await _get_department(session, slug) is None:
            session.add(Department(name=name, slug=slug))
    await session.commit()


async def _get_category(session, slug: str) -> Category | None:
    return (await session.execute(select(Category).where(Category.slug == slug))).scalars().first()


async def _seed_categories(session) -> None:
    for name, desc, order in CATEGORIES:
        slug = slugify(name)
        if await _get_category(session, slug) is None:
            session.add(Category(name=name, slug=slug, description=desc, sort_order=order))
    await session.commit()


async def _seed_tags(session) -> None:
    for name in TAGS:
        slug = slugify(name)
        exists = (await session.execute(select(Tag).where(Tag.slug == slug))).scalars().first()
        if exists is None:
            session.add(Tag(name=name, slug=slug))
    await session.commit()


async def _get_or_create_user(session, email, display_name, password, role, department_slug: str | None = None) -> User:
    user = (await session.execute(select(User).where(User.email == email))).scalars().first()
    department = await _get_department(session, department_slug) if department_slug else None
    if user is None:
        user = User(
            email=email,
            display_name=display_name,
            password_hash=security.hash_password(password),
            role=role,
            department_id=department.id if department else None,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    else:
        user.role = role
        user.department_id = department.id if department else None
        await session.commit()
        await session.refresh(user)
    return user


async def _tags(session, slugs: list[str]) -> list[Tag]:
    out = []
    for s in slugs:
        t = (await session.execute(select(Tag).where(Tag.slug == s))).scalars().first()
        if t:
            out.append(t)
    return out


async def _seed_skill(session, *, name, summary, owner, category_slug, status, install, source,
                      tags=None, department_slugs=None, featured=False, usage=None, rejection=None) -> None:
    exists = (await session.execute(select(Skill.id).where(func.lower(Skill.name) == name.lower()))).first()
    if exists:
        return
    category = await _get_category(session, category_slug)
    tag_rows = await _tags(session, tags or [])
    department_rows = []
    for slug in department_slugs or []:
        dept = await _get_department(session, slug)
        if dept is not None:
            department_rows.append(dept)
    published_at = datetime.now(timezone.utc) if status == SkillStatus.published else None
    skill = Skill(
        name=name,
        slug=slugify(name),
        summary=summary,
        owner_id=owner.id,
        category_id=category.id,
        status=status,
        is_featured=featured,
        install_command=install,
        source_url=source,
        usage_note=usage,
        rejection_reason=rejection,
        published_at=published_at,
        tags=tag_rows,
        departments=department_rows,
    )
    session.add(skill)
    await session.commit()


async def seed() -> None:
    async with SessionLocal() as session:
        await _seed_departments(session)
        await _seed_categories(session)
        await _seed_tags(session)
        admin = await _get_or_create_user(
            session, "admin@skillhub.example", "Priya Nayar", "admin12345", "admin"
        )
        mina = await _get_or_create_user(
            session, "mina@example.com", "Mina Torres", "creator123", "member", "engineering"
        )
        await _get_or_create_user(
            session, "product@example.com", "Parker Chen", "member12345", "member", "product"
        )

        await _seed_skill(
            session,
            name="Schema Drift Watcher",
            summary="Compares database migrations with application models and flags mismatched fields.",
            owner=mina,
            category_slug="backend",
            status=SkillStatus.published,
            install="codex skill install mina/schema-drift-watcher",
            source="github.com/mina/schema-drift-watcher",
            tags=["database", "sql"],
            department_slugs=["engineering", "qa"],
            featured=True,
            usage="Run before each release to catch drift between code and schema.",
        )
        await _seed_skill(
            session,
            name="Prompt Lint",
            summary="Static analysis for prompt templates: detects unescaped braces and oversized context.",
            owner=mina,
            category_slug="review",
            status=SkillStatus.published,
            install="claude skill add mina/prompt-lint",
            source="github.com/mina/prompt-lint",
            tags=["lint", "python"],
        )
        await _seed_skill(
            session,
            name="Dependency Drift Auditor",
            summary="Flags dependency drift across lockfiles and proposes safe upgrade batches.",
            owner=mina,
            category_slug="backend",
            status=SkillStatus.pending,
            install="codex skill install mina/dependency-drift-auditor",
            source="github.com/mina/dependency-drift-auditor",
            tags=["dependencies", "ci"],
        )
        await _seed_skill(
            session,
            name="Secret Scanner Lite",
            summary="Scans staged diffs for high-entropy strings and known secret patterns.",
            owner=mina,
            category_slug="security",
            status=SkillStatus.rejected,
            install="codex skill install mina/secret-scanner-lite",
            source="github.com/mina/secret-scanner-lite",
            tags=["secrets"],
            rejection="Install command pointed to an unverified mirror. Please link the canonical source.",
        )
        print(f"seed complete - admin={admin.email}, member={mina.email}")


if __name__ == "__main__":
    asyncio.run(seed())
