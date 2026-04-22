"""Timetable models: periods, period instances, holidays, extra sections."""

import uuid
from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class Period(UUIDPkMixin, TimestampMixin, Base):
    """A recurring class in a semester timetable.

    Represents: section X has subject Y taught by faculty Z in room R
    at timetable_slot S every week, valid between valid_from..valid_to.
    """

    __tablename__ = "periods"

    semester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("semesters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timetable_slot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("timetable_slots.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    period_type: Mapped[str] = mapped_column(
        Enum("lecture", "lab", "tutorial", "aptitude", name="period_type", native_enum=False),
        nullable=False,
        default="lecture",
    )
    lab_batch: Mapped[str | None] = mapped_column(String(8), nullable=True)
    is_elective_bundle: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)


class PeriodExtraSection(Base):
    """For aptitude/elective periods that span multiple sections."""

    __tablename__ = "period_extra_sections"

    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("periods.id", ondelete="CASCADE"),
        nullable=False,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (PrimaryKeyConstraint("period_id", "section_id"),)


class Holiday(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "holidays"

    date: Mapped[date] = mapped_column(Date, unique=True, nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String(256), nullable=False)


class PeriodInstance(UUIDPkMixin, TimestampMixin, Base):
    """A materialized class occurrence on a specific date.

    Generated nightly for the next 7 days from active periods,
    skipping holidays and cancelled periods.
    """

    __tablename__ = "period_instances"

    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        Enum("scheduled", "cancelled", "rescheduled", name="instance_status", native_enum=False),
        nullable=False,
        default="scheduled",
    )
    cancelled_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)

    __table_args__ = (UniqueConstraint("period_id", "date", name="uq_period_instance_date"),)
