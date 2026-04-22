"""Assignment and submission tracking models."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class Assignment(UUIDPkMixin, TimestampMixin, Base):
    """Assignment/practical/submission created by faculty."""

    __tablename__ = "assignments"

    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    assignment_type: Mapped[str] = mapped_column(
        Enum(
            "assignment",
            "practical",
            "lab_journal",
            "project",
            "other",
            name="assignment_type",
            native_enum=False,
        ),
        nullable=False,
        default="assignment",
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    max_marks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_ids: Mapped[str | None] = mapped_column(
        String(512), nullable=True
    )  # comma-separated section UUIDs


class Submission(UUIDPkMixin, TimestampMixin, Base):
    """Student submission for an assignment."""

    __tablename__ = "submissions"

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignments.id", ondelete="CASCADE"),
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
        Enum(
            "pending",
            "submitted",
            "checked",
            "graded",
            "late",
            name="submission_status",
            native_enum=False,
        ),
        nullable=False,
        default="pending",
    )
    proof_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    marks: Mapped[float | None] = mapped_column(Float, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(256), nullable=True)
    checked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        Index("ix_submission_assignment_student", "assignment_id", "student_id", unique=True),
    )
