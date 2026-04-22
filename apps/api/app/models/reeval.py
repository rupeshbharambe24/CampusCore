"""Re-evaluation request model — for class tests and mid-sems only."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class ReEvalRequest(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "reeval_requests"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    reason: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(
            "pending", "approved", "rejected", "resolved", name="reeval_status", native_enum=False
        ),
        nullable=False,
        default="pending",
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    new_marks: Mapped[str | None] = mapped_column(
        String(16), nullable=True
    )  # updated marks after re-eval
    reject_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)

    __table_args__ = (Index("ix_reeval_student_status", "student_id", "status"),)
