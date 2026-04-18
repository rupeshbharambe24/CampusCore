"""GET /me — returns the current user + role-specific profile."""

from fastapi import APIRouter, status
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models.enums import UserRole
from app.models.user import Faculty, Student
from app.schemas.user import FacultyProfile, MeResponse, StudentProfile, UserRead

router = APIRouter(tags=["me"])


@router.get("/me", status_code=status.HTTP_200_OK, response_model=MeResponse)
async def get_me(user: CurrentUser, db: DbSession) -> MeResponse:
    user_read = UserRead.model_validate(user)

    student_profile: StudentProfile | None = None
    faculty_profile: FacultyProfile | None = None

    if user.role == UserRole.STUDENT:
        result = await db.execute(select(Student).where(Student.user_id == user.id))
        row = result.scalar_one_or_none()
        if row:
            student_profile = StudentProfile.model_validate(row)

    elif user.role in (UserRole.FACULTY, UserRole.HOD):
        result = await db.execute(select(Faculty).where(Faculty.user_id == user.id))
        row = result.scalar_one_or_none()
        if row:
            faculty_profile = FacultyProfile.model_validate(row)

    return MeResponse(user=user_read, student=student_profile, faculty=faculty_profile)
