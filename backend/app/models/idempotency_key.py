"""Idempotency-key replay store (api.md §4 / implement.md §3.8).

Infrastructure table — not a domain entity from schema.md. It records the skill a keyed
mutation produced so a retry with the same ``Idempotency-Key`` replays that result without
creating a second ``review_action`` (or a duplicate skill on submit).
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IdempotencyKey(Base):
    __tablename__ = "idempotency_key"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    skill_id: Mapped[str | None] = mapped_column(
        ForeignKey("skill.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
