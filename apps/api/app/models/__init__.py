"""SQLAlchemy ORM models. Import models here so Alembic autogenerate picks them up."""

from app.core.db import Base
from app.models.academic import (
    AcademicYear,
    FacultySubjectAssignment,
    Room,
    Section,
    SectionSubject,
    Semester,
    Subject,
    TimetableSlot,
)
from app.models.activity import Activity, ActivityMembership
from app.models.audit_log import AuditLog
from app.models.branch import Branch
from app.models.department import Department
from app.models.enums import UserRole
from app.models.user import Faculty, Student, User

__all__ = [
    "AcademicYear",
    "Activity",
    "ActivityMembership",
    "AuditLog",
    "Base",
    "Branch",
    "Department",
    "Faculty",
    "FacultySubjectAssignment",
    "Room",
    "Section",
    "SectionSubject",
    "Semester",
    "Student",
    "Subject",
    "TimetableSlot",
    "User",
    "UserRole",
]
