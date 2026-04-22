"""Pydantic schemas for attendance."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Faculty: mark attendance
# ---------------------------------------------------------------------------


class AttendanceMark(BaseModel):
    student_id: uuid.UUID
    status: str = Field(pattern=r"^(present|absent)$")


class SubmitAttendanceRequest(BaseModel):
    marks: list[AttendanceMark]


class SubmitAttendanceResponse(BaseModel):
    period_instance_id: uuid.UUID
    upserted: int


# ---------------------------------------------------------------------------
# Faculty: edit single record
# ---------------------------------------------------------------------------


class EditAttendanceRequest(BaseModel):
    status: str = Field(pattern=r"^(present|absent|activity|leave)$")
    reason: str = Field(min_length=3, max_length=256)


# ---------------------------------------------------------------------------
# Attendance record read
# ---------------------------------------------------------------------------


class AttendanceRecordRead(BaseModel):
    id: uuid.UUID
    period_instance_id: uuid.UUID
    student_id: uuid.UUID
    status: str
    marked_by: uuid.UUID | None
    marked_at: datetime
    edited_at: datetime | None
    edit_reason: str | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Roster entry (student in a period's class)
# ---------------------------------------------------------------------------


class RosterEntry(BaseModel):
    student_id: uuid.UUID
    roll_number: str
    full_name: str
    lab_batch: str | None
    status: str | None = None  # null if not yet marked


# ---------------------------------------------------------------------------
# Student: attendance summary
# ---------------------------------------------------------------------------


class SubjectAttendanceRead(BaseModel):
    subject_id: uuid.UUID
    subject_code: str
    subject_name: str
    total: int
    present: int
    activity: int
    absent: int
    percentage: float
    lecture_percentage: float


class AttendanceSummary(BaseModel):
    total_classes: int
    present: int
    activity: int
    absent: int
    overall_percentage: float
    lecture_only_percentage: float
    subjects_below_75: list[str]
    subjects_below_75_count: int
