"""Faculty leave model — faculty applies to HOD."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class FacultyLeave(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "faculty_leaves"

    faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    leave_type: Mapped[str] = mapped_column(
        Enum(
            "casual",
            "sick",
            "earned",
            "duty",
            "other",
            name="faculty_leave_type",
            native_enum=False,
        ),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("pending", "approved", "rejected", name="faculty_leave_status", native_enum=False),
        nullable=False,
        default="pending",
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reject_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)

    __table_args__ = (Index("ix_fac_leave_dept_status", "department_id", "status"),)
