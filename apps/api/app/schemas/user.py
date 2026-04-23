"""Pydantic schemas for user, student, and faculty responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    phone: str | None = None
    photo_url: str | None = None


class UserRead(UserBase):
    id: uuid.UUID
    is_active: bool
    must_change_password: bool
    last_login_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentProfile(BaseModel):
    roll_number: str
    prn: str | None = None
    branch_id: uuid.UUID
    admission_year: int
    current_section_id: uuid.UUID | None = None
    lab_batch: str | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_relation: str | None = None
    address: str | None = None
    blood_group: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    category: str | None = None
    is_detained: bool = False
    is_graduated: bool = False

    model_config = {"from_attributes": True}


class FacultyProfile(BaseModel):
    employee_id: str
    department_id: uuid.UUID
    designation: str | None = None
    is_hod: bool

    model_config = {"from_attributes": True}


class MeResponse(BaseModel):
    """Combined user + role-specific profile for GET /me."""

    user: UserRead
    student: StudentProfile | None = None
    faculty: FacultyProfile | None = None
