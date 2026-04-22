"""Batch model — first-class entity for student grouping.

A batch = admission year cohort. E.g., "2024 batch" = students admitted in 2024,
graduating in 2028, currently in SY (if current year is 2025-26).
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

YEAR_LABELS = {1: "FY", 2: "SY", 3: "TY", 4: "Final Year"}


class Batch(UUIDPkMixin, TimestampMixin, Base):
    """A student cohort identified by admission year."""

    __tablename__ = "batches"

    admission_year: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    current_semester_num: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1-8
    is_graduated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    @property
    def graduation_year(self) -> int:
        return self.admission_year + 4

    @property
    def current_year_of_study(self) -> int:
        """1=FY, 2=SY, 3=TY, 4=Final — derived from current_semester_num."""
        return min(4, (self.current_semester_num + 1) // 2)

    @property
    def is_odd_semester(self) -> bool:
        return self.current_semester_num % 2 == 1

    @property
    def label(self) -> str:
        if self.is_graduated:
            return f"{self.graduation_year} Batch — Graduated"
        yr = self.current_year_of_study
        yr_label = YEAR_LABELS.get(yr, f"Year {yr}")
        sem_type = "Odd" if self.is_odd_semester else "Even"
        return f"{self.graduation_year} Batch — {yr_label} (Sem {self.current_semester_num}, {sem_type})"


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
    name: Mapped[str] = mapped_column(String(8), nullable=False)
    lab_batch_count: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    __table_args__ = (
        UniqueConstraint("batch_id", "department_id", "name", name="uq_division_batch_dept_name"),
    )
