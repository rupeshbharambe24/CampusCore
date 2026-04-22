"""Activity models — clubs, teams, NSS, sports, etc."""

import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class Activity(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "activities"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    kind: Mapped[str] = mapped_column(
        Enum(
            "club",
            "team",
            "competition",
            "nss",
            "sports",
            "cultural",
            "other",
            name="activity_kind",
            native_enum=False,
        ),
        nullable=False,
        default="club",
    )
    coordinator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ActivityMembership(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "activity_memberships"

    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)  # "Captain", "Member"

    __table_args__ = (UniqueConstraint("activity_id", "student_id", name="uq_activity_membership"),)
