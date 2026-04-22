"""Pydantic schemas for all Phase 2 academic entities."""

import uuid
from datetime import date

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------
class DepartmentCreate(BaseModel):
    code: str = Field(max_length=16)
    name: str = Field(max_length=128)


class DepartmentRead(DepartmentCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Branch
# ---------------------------------------------------------------------------
class BranchCreate(BaseModel):
    department_id: uuid.UUID
    code: str = Field(max_length=16)
    name: str = Field(max_length=128)
    duration_years: int = 4


class BranchRead(BranchCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Academic Year
# ---------------------------------------------------------------------------
class AcademicYearCreate(BaseModel):
    label: str = Field(max_length=16)
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearRead(AcademicYearCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Semester
# ---------------------------------------------------------------------------
class SemesterCreate(BaseModel):
    academic_year_id: uuid.UUID
    number: int = Field(ge=1, le=2)
    start_date: date
    end_date: date
    is_current: bool = False


class SemesterRead(SemesterCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Section
# ---------------------------------------------------------------------------
class SectionCreate(BaseModel):
    semester_id: uuid.UUID
    branch_id: uuid.UUID
    year_of_study: int = Field(ge=1, le=6)
    name: str = Field(max_length=8)
    lab_batch_count: int = 3


class SectionRead(SectionCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------
class SubjectCreate(BaseModel):
    code: str = Field(max_length=16)
    name: str = Field(max_length=128)
    credits: int = 3
    kind: str = "lecture"
    department_id: uuid.UUID


class SubjectRead(SubjectCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Section-Subject
# ---------------------------------------------------------------------------
class SectionSubjectCreate(BaseModel):
    section_id: uuid.UUID
    subject_id: uuid.UUID


class SectionSubjectRead(SectionSubjectCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Faculty-Subject Assignment
# ---------------------------------------------------------------------------
class FacultyAssignmentCreate(BaseModel):
    faculty_id: uuid.UUID
    section_subject_id: uuid.UUID
    lab_batch: str | None = None


class FacultyAssignmentRead(FacultyAssignmentCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Room
# ---------------------------------------------------------------------------
class RoomCreate(BaseModel):
    building: str = Field(max_length=64)
    name: str = Field(max_length=64)
    capacity: int | None = None


class RoomRead(RoomCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Timetable Slot
# ---------------------------------------------------------------------------
class TimetableSlotCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: str = Field(max_length=8)
    end_time: str = Field(max_length=8)
    slot_label: str = Field(max_length=8)


class TimetableSlotRead(TimetableSlotCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Activity
# ---------------------------------------------------------------------------
class ActivityCreate(BaseModel):
    name: str = Field(max_length=128)
    kind: str = "club"
    coordinator_id: uuid.UUID | None = None
    is_active: bool = True


class ActivityRead(ActivityCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}
