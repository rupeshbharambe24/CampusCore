"""Attendance record model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import UUIDPkMixin


class AttendanceRecord(UUIDPkMixin, Base):
    __tablename__ = "attendance_records"

    period_instance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("period_instances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        Enum("present", "absent", "activity", "leave", name="attendance_status", native_enum=False),
        nullable=False,
    )
    marked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    marked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    edit_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)

    __table_args__ = (
        UniqueConstraint("period_instance_id", "student_id", name="uq_attendance_instance_student"),
    )
