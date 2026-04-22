"""Exam models: exams, schedules, results, seating arrangements."""

import uuid
from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class Exam(UUIDPkMixin, TimestampMixin, Base):
    """An exam event: class test 1, mid-sem, end-sem, etc."""

    __tablename__ = "exams"

    semester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("semesters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)  # "Class Test 1", "Mid-Sem"
    exam_type: Mapped[str] = mapped_column(
        Enum(
            "class_test",
            "mid_sem",
            "end_sem",
            "practical",
            "viva",
            name="exam_type",
            native_enum=False,
        ),
        nullable=False,
    )
    max_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ExamSchedule(UUIDPkMixin, TimestampMixin, Base):
    """Schedule entry: which subject exam on which date/time in which room."""

    __tablename__ = "exam_schedules"

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
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)  # "09:00"
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)  # "11:00"
    sections: Mapped[str | None] = mapped_column(
        String(256), nullable=True
    )  # "CSE-A,CSE-B" or null=all

    __table_args__ = (UniqueConstraint("exam_id", "subject_id", name="uq_exam_schedule_subject"),)


class ExamResult(UUIDPkMixin, TimestampMixin, Base):
    """Individual student result for an exam + subject."""

    __tablename__ = "exam_results"

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
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    is_absent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rank_in_section: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rank_in_branch: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_id", "subject_id", "student_id", name="uq_exam_result"),
        Index("ix_exam_result_exam_subject", "exam_id", "subject_id"),
    )


class SeatingArrangement(UUIDPkMixin, TimestampMixin, Base):
    """Seat assignment: student X sits in room Y at seat Z for a specific exam schedule."""

    __tablename__ = "seating_arrangements"

    exam_schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exam_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)
    bench_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_schedule_id", "student_id", name="uq_seating_student"),
        UniqueConstraint("exam_schedule_id", "room_id", "seat_number", name="uq_seating_seat"),
    )
