"""``skill_tag`` join table (schema.md) for the skill ↔ tag many-to-many. Composite PK."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SkillTag(Base):
    __tablename__ = "skill_tag"

    skill_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("skill.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# Reverse lookup "skills by tag" (schema.md skill_tag_tag_idx).
Index("skill_tag_tag_idx", SkillTag.tag_id)
