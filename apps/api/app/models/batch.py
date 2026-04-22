"""Batch model — first-class entity for student grouping.

A batch = admission year cohort. E.g., "2024 batch" = students admitted in 2024,
graduating in 2028, currently in SY (if current year is 2025-26).

The system auto-calculates year_of_study and current semester from admission_year
and today's date. Admin never manually picks semesters.
"""

import uuid
from datetime import date

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class Batch(UUIDPkMixin, TimestampMixin, Base):
    """A student cohort identified by admission year."""

    __tablename__ = "batches"

    admission_year: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    # graduation_year is always admission_year + 4 (B.Tech)

    @property
    def graduation_year(self) -> int:
        return self.admission_year + 4

    @property
    def current_year_of_study(self) -> int:
        """1=FY, 2=SY, 3=TY, 4=Final based on current date."""
        today = date.today()
        # Academic year starts in June
        academic_year_start = today.year if today.month >= 6 else today.year - 1
        year = academic_year_start - self.admission_year + 1
        return max(1, min(4, year))

    @property
    def label(self) -> str:
        labels = {1: "FY", 2: "SY", 3: "TY", 4: "Final Year"}
        yr = self.current_year_of_study
        return f"{self.graduation_year} Batch — {labels.get(yr, f'Year {yr}')}"


class Division(UUIDPkMixin, TimestampMixin, Base):
    """A division within a batch+department. E.g., AIDS SY-A."""

    __tablename__ = "divisions"

    batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(8), nullable=False)  # "A", "B", "C"
    lab_batch_count: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    __table_args__ = (
        UniqueConstraint("batch_id", "department_id", "name", name="uq_division_batch_dept_name"),
    )

    @property
    def display_name(self) -> str:
        return self.name  # Will be combined with dept+year at API level
