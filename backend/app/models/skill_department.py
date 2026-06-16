"""skill_department join table for department-scoped published skill visibility."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SkillDepartment(Base):
    __tablename__ = "skill_department"

    skill_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("skill.id", ondelete="CASCADE"), primary_key=True
    )
    department_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("department.id", ondelete="RESTRICT"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


Index("skill_department_dept_idx", SkillDepartment.department_id)
