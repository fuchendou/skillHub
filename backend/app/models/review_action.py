"""``review_action`` entity (schema.md) — append-only audit log of lifecycle actions.

This is the user↔skill relation table. Immutable: no ``updated_at``, never UPDATEd.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReviewActionType(str, enum.Enum):
    submit = "submit"
    resubmit = "resubmit"
    edit = "edit"
    publish = "publish"
    reject = "reject"
    feature = "feature"
    unfeature = "unfeature"
    unpublish = "unpublish"


class ReviewAction(Base):
    __tablename__ = "review_action"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_id: Mapped[str] = mapped_column(ForeignKey("skill.id", ondelete="CASCADE"), nullable=False)
    # SET NULL keeps the audit trail even if the acting user is later removed (schema.md cascade rules).
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[ReviewActionType] = mapped_column(
        Enum(ReviewActionType, native_enum=False, length=20), nullable=False
    )
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actor = relationship("User", lazy="selectin")


# Per-skill timeline, per-actor history, recent activity feed (schema.md).
Index("review_action_skill_idx", ReviewAction.skill_id)
Index("review_action_actor_idx", ReviewAction.actor_id)
Index("review_action_created_idx", ReviewAction.created_at.desc())
