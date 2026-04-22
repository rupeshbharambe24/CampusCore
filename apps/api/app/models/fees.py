"""Fees models: structures, records, receipts."""

import uuid
from datetime import date

from sqlalchemy import (
    Date,
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


class FeeStructure(UUIDPkMixin, TimestampMixin, Base):
    """Fee structure template: tuition, exam, lab, library, etc."""

    __tablename__ = "fee_structures"

    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    year_of_study: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fee_type: Mapped[str] = mapped_column(
        Enum(
            "tuition",
            "exam",
            "lab",
            "library",
            "development",
            "sports",
            "other",
            name="fee_type",
            native_enum=False,
        ),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class FeeRecord(UUIDPkMixin, TimestampMixin, Base):
    """Individual fee record for a student — what they owe and what they've paid."""

    __tablename__ = "fee_records"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fee_structure_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_structures.id", ondelete="SET NULL"),
        nullable=True,
    )
    fee_type: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(String(256), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(
            "pending", "partial", "paid", "overdue", "waived", name="fee_status", native_enum=False
        ),
        nullable=False,
        default="pending",
    )
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (Index("ix_fee_records_student_status", "student_id", "status"),)


class FeeReceipt(UUIDPkMixin, TimestampMixin, Base):
    """Payment receipt uploaded by fees department."""

    __tablename__ = "fee_receipts"

    fee_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    receipt_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_mode: Mapped[str] = mapped_column(
        Enum(
            "cash", "upi", "neft", "cheque", "dd", "other", name="payment_mode", native_enum=False
        ),
        nullable=False,
    )
    receipt_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(256), nullable=True)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
