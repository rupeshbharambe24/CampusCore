"""Academic calendar events."""

from datetime import date as date_type

from sqlalchemy import Date, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class CalendarEvent(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "calendar_events"

    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    event_type: Mapped[str] = mapped_column(
        Enum(
            "holiday",
            "exam_week",
            "event",
            "deadline",
            "meeting",
            "other",
            name="calendar_event_type",
            native_enum=False,
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    visible_to: Mapped[str] = mapped_column(
        Enum("all", "students", "faculty", "admin", name="event_visibility", native_enum=False),
        nullable=False,
        default="all",
    )
