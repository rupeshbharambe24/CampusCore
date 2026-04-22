"""User, Student, and Faculty models.

Design notes:
- `users.id` is a UUID. In staging/prod this equals `auth.users.id` from Supabase.
- We do NOT store a password_hash locally in the long run — Supabase Auth owns that.
  For Phase 1 local-dev convenience, a nullable `password_hash` column exists and is
  used only when Supabase is not configured (env `SUPABASE_URL` unset).
- `students.user_id` and `faculty.user_id` are 1:1 FKs back to `users.id`; a given
  user is exactly one of: student OR faculty OR admin (role distinguishes).
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin, UUIDPkMixin


class User(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "users"

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, length=16),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(256), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(256), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Local-only auth (dev / fallback until Supabase is wired). Nullable because
    # Supabase-managed users won't have a local hash.
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    roll_number: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True
    )  # local: AI2001
    prn: Mapped[str | None] = mapped_column(
        String(13), nullable=True, unique=True, index=True
    )  # 13-digit university PRN
    branch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    admission_year: Mapped[int] = mapped_column(Integer, nullable=False)
    current_section_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    lab_batch: Mapped[str | None] = mapped_column(String(8), nullable=True)
    is_detained: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_graduated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Personal details
    guardian_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    guardian_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    guardian_relation: Mapped[str | None] = mapped_column(
        String(32), nullable=True
    )  # Father, Mother, Guardian
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)  # A+, B-, O+, etc
    date_of_birth: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)  # Male, Female, Other
    category: Mapped[str | None] = mapped_column(
        String(32), nullable=True
    )  # Open, OBC, SC, ST, NT, etc

    __table_args__ = (UniqueConstraint("roll_number", name="uq_students_roll_number"),)


class Faculty(TimestampMixin, Base):
    __tablename__ = "faculty"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    employee_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    designation: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_hod: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (UniqueConstraint("employee_id", name="uq_faculty_employee_id"),)
