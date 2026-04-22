"""Pydantic schemas for activity attendance requests + notifications."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Activity attendance requests
# ---------------------------------------------------------------------------


class ActivityRequestCreate(BaseModel):
    activity_id: uuid.UUID
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=512)
    proof_url: str | None = None


class ActivityRequestRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    activity_id: uuid.UUID
    start_date: date
    end_date: date
    reason: str
    proof_url: str | None
    status: str
    approver_id: uuid.UUID | None
    approved_at: datetime | None
    reject_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RejectRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=256)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


class NotificationRead(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    body: str
    link: str | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
