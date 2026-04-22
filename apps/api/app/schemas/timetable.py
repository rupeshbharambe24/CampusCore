"""Pydantic schemas for timetable entities."""

import uuid
from datetime import date

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Period
# ---------------------------------------------------------------------------
class PeriodCreate(BaseModel):
    semester_id: uuid.UUID
    section_id: uuid.UUID
    timetable_slot_id: uuid.UUID
    subject_id: uuid.UUID
    faculty_id: uuid.UUID
    room_id: uuid.UUID | None = None
    period_type: str = "lecture"
    lab_batch: str | None = None
    is_elective_bundle: bool = False
    valid_from: date
    valid_to: date | None = None
    extra_section_ids: list[uuid.UUID] = Field(default_factory=list)


class PeriodRead(BaseModel):
    id: uuid.UUID
    semester_id: uuid.UUID
    section_id: uuid.UUID
    timetable_slot_id: uuid.UUID
    subject_id: uuid.UUID
    faculty_id: uuid.UUID
    room_id: uuid.UUID | None
    period_type: str
    lab_batch: str | None
    is_elective_bundle: bool
    valid_from: date
    valid_to: date | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Holiday
# ---------------------------------------------------------------------------
class HolidayCreate(BaseModel):
    date: date
    reason: str = Field(max_length=256)


class HolidayRead(HolidayCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Period Instance
# ---------------------------------------------------------------------------
class PeriodInstanceRead(BaseModel):
    id: uuid.UUID
    period_id: uuid.UUID
    date: date
    status: str
    cancelled_reason: str | None

    model_config = {"from_attributes": True}


class CancelInstanceRequest(BaseModel):
    reason: str = Field(max_length=256)


# ---------------------------------------------------------------------------
# Collision response
# ---------------------------------------------------------------------------
class CollisionRead(BaseModel):
    kind: str
    period_id: uuid.UUID
    conflicting_period_id: uuid.UUID
    detail: str


# ---------------------------------------------------------------------------
# Generation request
# ---------------------------------------------------------------------------
class GenerateInstancesRequest(BaseModel):
    semester_id: uuid.UUID
    start_date: date
    end_date: date


class GenerateInstancesResponse(BaseModel):
    created: int


# ---------------------------------------------------------------------------
# Student/Faculty timetable view
# ---------------------------------------------------------------------------
class TimetableEntry(BaseModel):
    """A single timetable entry for display."""

    period_id: uuid.UUID
    instance_id: uuid.UUID | None = None
    day_of_week: int
    start_time: str
    end_time: str
    slot_label: str
    subject_code: str
    subject_name: str
    faculty_name: str
    room_name: str | None = None
    period_type: str
    lab_batch: str | None = None
    status: str = "scheduled"
