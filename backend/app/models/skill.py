"""``skill`` entity (schema.md) — the core record: metadata, install command, lifecycle, featured flag."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Approved install-command format (schema.md skill.install_command).
INSTALL_COMMAND_REGEX = r"^(codex|claude|gemini|opencode)\s+skill\s+(install|add)\s+[A-Za-z0-9._/-]+$"


class SkillStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    published = "published"
    rejected = "rejected"
    unpublished = "unpublished"


class Skill(Base):
    __tablename__ = "skill"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)  # case-insensitive uniqueness via index below
    slug: Mapped[str] = mapped_column(String(140), nullable=False, unique=True)
    summary: Mapped[str] = mapped_column(String(280), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"), nullable=False)
    category_id: Mapped[str] = mapped_column(ForeignKey("category.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[SkillStatus] = mapped_column(
        Enum(SkillStatus, native_enum=False, length=20),
        nullable=False,
        default=SkillStatus.draft,
        server_default=SkillStatus.draft.value,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    install_command: Mapped[str] = mapped_column(String(255), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)  # case-insensitive uniqueness via index below
    usage_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_label: Mapped[str | None] = mapped_column(String(40), nullable=True, server_default="Low risk")
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner = relationship("User", lazy="selectin")
    category = relationship("Category", lazy="selectin")
    tags = relationship("Tag", secondary="skill_tag", lazy="selectin", order_by="Tag.name")


# Case-insensitive unique indexes (schema.md: skill_name_uniq, skill_source_uniq).
Index("skill_name_uniq", func.lower(Skill.name), unique=True)
Index("skill_source_uniq", func.lower(Skill.source_url), unique=True)
# Query-serving indexes (schema.md Index Recommendations).
Index("skill_status_idx", Skill.status)
Index("skill_status_featured_idx", Skill.status, Skill.is_featured)
Index("skill_status_category_idx", Skill.status, Skill.category_id)
Index("skill_owner_idx", Skill.owner_id)
Index("skill_published_at_idx", Skill.published_at.desc())
