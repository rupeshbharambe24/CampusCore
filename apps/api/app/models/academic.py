"""Academic structure models: years, semesters, sections, subjects, assignments."""

import uuid
from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

# ---------------------------------------------------------------------------
# Academic Year + Semester
# ---------------------------------------------------------------------------


class AcademicYear(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "academic_years"

    label: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)  # "2025-26"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Semester(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "semesters"

    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 or 2 within year
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


# ---------------------------------------------------------------------------
# Section (a group of students within a branch-year)
# ---------------------------------------------------------------------------


class Section(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "sections"

    semester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("semesters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    year_of_study: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3, 4
    name: Mapped[str] = mapped_column(String(8), nullable=False)  # "A", "B", "C"
    lab_batch_count: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    __table_args__ = (
        UniqueConstraint(
            "semester_id",
            "branch_id",
            "year_of_study",
            "name",
            name="uq_sections_sem_branch_year_name",
        ),
    )


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------


class SubjectKind:
    LECTURE = "lecture"
    LAB = "lab"
    TUTORIAL = "tutorial"
    APTITUDE = "aptitude"


class Subject(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "subjects"

    code: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    kind: Mapped[str] = mapped_column(
        Enum("lecture", "lab", "tutorial", "aptitude", name="subject_kind", native_enum=False),
        nullable=False,
        default="lecture",
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )


# ---------------------------------------------------------------------------
# Section ↔ Subject (which subjects a section studies this semester)
# ---------------------------------------------------------------------------


class SectionSubject(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "section_subjects"

    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (UniqueConstraint("section_id", "subject_id", name="uq_section_subjects"),)


# ---------------------------------------------------------------------------
# Faculty ↔ Subject Assignment (who teaches what to whom)
# ---------------------------------------------------------------------------


class FacultySubjectAssignment(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "faculty_subject_assignments"

    faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("section_subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lab_batch: Mapped[str | None] = mapped_column(String(8), nullable=True)  # null=lecture

    __table_args__ = (
        UniqueConstraint(
            "faculty_id",
            "section_subject_id",
            "lab_batch",
            name="uq_faculty_subject_batch",
        ),
    )


# ---------------------------------------------------------------------------
# Room
# ---------------------------------------------------------------------------


class Room(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "rooms"

    building: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)  # "LT-1", "Lab-203"
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("building", "name", name="uq_rooms_building_name"),)


# ---------------------------------------------------------------------------
# Timetable Slot (abstract grid: "Monday 9:00-9:50")
# ---------------------------------------------------------------------------


class TimetableSlot(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "timetable_slots"

    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon ... 6=Sun
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)  # "09:00"
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)  # "09:50"
    slot_label: Mapped[str] = mapped_column(String(8), nullable=False)  # "P1", "P2"

    __table_args__ = (
        UniqueConstraint("day_of_week", "start_time", name="uq_timetable_slot_day_time"),
    )
