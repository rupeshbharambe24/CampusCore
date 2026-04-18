"""Dev-only endpoints. Excluded from production builds via environment check."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import DbSession
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import Faculty, Student, User

router = APIRouter(prefix="/dev", tags=["dev"])


class SeedUserRequest(BaseModel):
    email: str
    full_name: str
    password: str
    role: UserRole
    # Student fields (required if role=student)
    roll_number: str | None = None
    branch_id: str | None = None
    admission_year: int | None = None
    # Faculty fields (required if role=faculty|hod)
    employee_id: str | None = None
    department_id: str | None = None
    designation: str | None = None
    is_hod: bool = False


class SeedUserResponse(BaseModel):
    user_id: str
    email: str
    role: str


@router.post("/seed-user", status_code=status.HTTP_201_CREATED, response_model=SeedUserResponse)
async def seed_user(body: SeedUserRequest, db: DbSession) -> SeedUserResponse:
    settings = get_settings()
    if settings.environment != "local":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Dev endpoints are disabled in production")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, f"User {body.email} already exists")

    import uuid

    user = User(
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        password_hash=hash_password(body.password),
        is_active=True,
        must_change_password=False,
    )
    db.add(user)
    await db.flush()

    if body.role == UserRole.STUDENT:
        if not body.roll_number or not body.branch_id:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "roll_number and branch_id required for student",
            )
        student = Student(
            user_id=user.id,
            roll_number=body.roll_number,
            branch_id=uuid.UUID(body.branch_id),
            admission_year=body.admission_year or 2024,
        )
        db.add(student)

    elif body.role in (UserRole.FACULTY, UserRole.HOD):
        if not body.employee_id or not body.department_id:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "employee_id and department_id required for faculty",
            )
        faculty = Faculty(
            user_id=user.id,
            employee_id=body.employee_id,
            department_id=uuid.UUID(body.department_id),
            designation=body.designation,
            is_hod=body.is_hod,
        )
        db.add(faculty)

    await db.commit()

    return SeedUserResponse(user_id=str(user.id), email=user.email, role=user.role)
