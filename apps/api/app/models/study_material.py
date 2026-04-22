"""Study materials: notes, PPTs, Google Drive links uploaded by faculty."""

import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin


class StudyMaterial(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "study_materials"

    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    material_type: Mapped[str] = mapped_column(
        Enum(
            "notes",
            "ppt",
            "pdf",
            "video",
            "drive_link",
            "assignment",
            "reference",
            "other",
            name="material_type",
            native_enum=False,
        ),
        nullable=False,
        default="notes",
    )
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    topic: Mapped[str | None] = mapped_column(String(128), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
