"""Admin dashboard real stats."""

from typing import Any

from fastapi import APIRouter
from sqlalchemy import func, select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.academic import Section, Subject
from app.models.department import Department
from app.models.user import Faculty, Student

router = APIRouter(tags=["dashboard"])


@router.get("/admin/dashboard-stats")
async def admin_dashboard_stats(user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return {}

    student_count = (await db.execute(select(func.count()).select_from(Student))).scalar_one()
    faculty_count = (await db.execute(select(func.count()).select_from(Faculty))).scalar_one()
    dept_count = (await db.execute(select(func.count()).select_from(Department))).scalar_one()
    section_count = (await db.execute(select(func.count()).select_from(Section))).scalar_one()
    subject_count = (await db.execute(select(func.count()).select_from(Subject))).scalar_one()

    return {
        "total_students": student_count,
        "total_faculty": faculty_count,
        "total_departments": dept_count,
        "total_sections": section_count,
        "total_subjects": subject_count,
    }
