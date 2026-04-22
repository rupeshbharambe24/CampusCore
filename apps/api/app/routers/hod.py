"""HOD endpoints — department-scoped management.

HOD can:
- View/manage their department's faculty, students, sections, subjects
- Approve/reject leave applications from their department's students
- View department attendance stats
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import (
    Branch,
    Department,
    LeaveApplication,
    Section,
    Subject,
    UserRole,
)
from app.models.notification import Notification
from app.models.user import Faculty, Student, User

router = APIRouter(prefix="/hod", tags=["hod"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_hod_dept(user: User, db: AsyncSession) -> uuid.UUID:
    """Get the HOD's department_id. Raises 403 if not an HOD."""
    if user.role not in (UserRole.HOD, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "HOD access required")

    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        # Admins can pass dept_id as query param — handled by caller
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admins should use /admin endpoints")

    result = await db.execute(select(Faculty).where(Faculty.user_id == user.id))
    faculty = result.scalar_one_or_none()
    if not faculty or not faculty.is_hod:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not an HOD")

    return faculty.department_id


# ---------------------------------------------------------------------------
# Department overview
# ---------------------------------------------------------------------------


class DeptOverview(BaseModel):
    department_name: str
    department_code: str
    total_faculty: int
    total_students: int
    total_sections: int
    total_subjects: int
    pending_leaves: int


@router.get("/overview", response_model=DeptOverview)
async def hod_overview(user: CurrentUser, db: DbSession) -> Any:
    dept_id = await _get_hod_dept(user, db)

    dept_result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = dept_result.scalar_one()

    # Count faculty
    fac_count = await db.execute(
        select(func.count()).select_from(Faculty).where(Faculty.department_id == dept_id)
    )
    # Count students (via branches in this department)
    branch_ids_result = await db.execute(select(Branch.id).where(Branch.department_id == dept_id))
    branch_ids = list(branch_ids_result.scalars().all())

    student_count_result = (
        await db.execute(
            select(func.count()).select_from(Student).where(Student.branch_id.in_(branch_ids))
        )
        if branch_ids
        else None
    )

    # Count sections
    section_count_result = (
        await db.execute(
            select(func.count()).select_from(Section).where(Section.branch_id.in_(branch_ids))
        )
        if branch_ids
        else None
    )

    # Count subjects
    subj_count = await db.execute(
        select(func.count()).select_from(Subject).where(Subject.department_id == dept_id)
    )

    # Pending leaves
    leave_count = await db.execute(
        select(func.count())
        .select_from(LeaveApplication)
        .where(
            LeaveApplication.department_id == dept_id,
            LeaveApplication.status == "pending",
        )
    )

    return DeptOverview(
        department_name=dept.name,
        department_code=dept.code,
        total_faculty=fac_count.scalar_one(),
        total_students=student_count_result.scalar_one() if student_count_result else 0,
        total_sections=section_count_result.scalar_one() if section_count_result else 0,
        total_subjects=subj_count.scalar_one(),
        pending_leaves=leave_count.scalar_one(),
    )


# ---------------------------------------------------------------------------
# Department faculty list
# ---------------------------------------------------------------------------


class FacultyListItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    employee_id: str
    designation: str | None
    is_hod: bool


@router.get("/faculty", response_model=list[FacultyListItem])
async def hod_faculty_list(user: CurrentUser, db: DbSession) -> Any:
    dept_id = await _get_hod_dept(user, db)

    result = await db.execute(
        select(Faculty, User)
        .join(User, Faculty.user_id == User.id)
        .where(Faculty.department_id == dept_id)
        .order_by(User.full_name)
    )
    return [
        FacultyListItem(
            user_id=str(f.user_id),
            full_name=u.full_name,
            email=u.email,
            employee_id=f.employee_id,
            designation=f.designation,
            is_hod=f.is_hod,
        )
        for f, u in result.all()
    ]


# ---------------------------------------------------------------------------
# Department student list
# ---------------------------------------------------------------------------


class StudentListItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    roll_number: str
    admission_year: int
    lab_batch: str | None
    section_name: str | None


@router.get("/students", response_model=list[StudentListItem])
async def hod_student_list(user: CurrentUser, db: DbSession) -> Any:
    dept_id = await _get_hod_dept(user, db)

    branch_ids_result = await db.execute(select(Branch.id).where(Branch.department_id == dept_id))
    branch_ids = list(branch_ids_result.scalars().all())
    if not branch_ids:
        return []

    result = await db.execute(
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.branch_id.in_(branch_ids))
        .order_by(Student.roll_number)
    )

    items = []
    for s, u in result.all():
        sec_name = None
        if s.current_section_id:
            sec_result = await db.execute(
                select(Section.name).where(Section.id == s.current_section_id)
            )
            sec_name = sec_result.scalar_one_or_none()
        items.append(
            StudentListItem(
                user_id=str(s.user_id),
                full_name=u.full_name,
                email=u.email,
                roll_number=s.roll_number,
                admission_year=s.admission_year,
                lab_batch=s.lab_batch,
                section_name=sec_name,
            )
        )
    return items


# ---------------------------------------------------------------------------
# Leave applications
# ---------------------------------------------------------------------------


class LeaveAppCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str = Field(min_length=3, max_length=512)
    proof_url: str | None = None


class LeaveAppRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    department_id: uuid.UUID
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    proof_url: str | None
    status: str
    reviewed_by: uuid.UUID | None
    reviewed_at: str | None
    reject_reason: str | None
    created_at: str

    model_config = {"from_attributes": True}


class RejectBody(BaseModel):
    reason: str = Field(min_length=3, max_length=256)


# Student submits leave application
@router.post("/leave-applications", status_code=201, response_model=LeaveAppRead)
async def submit_leave(body: LeaveAppCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    # Get student's department via branch
    student_result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student profile not found")

    branch_result = await db.execute(select(Branch).where(Branch.id == student.branch_id))
    branch = branch_result.scalar_one()

    app = LeaveApplication(
        student_id=user.id,
        department_id=branch.department_id,
        leave_type=body.leave_type,
        start_date=body.start_date,
        end_date=body.end_date,
        reason=body.reason,
        proof_url=body.proof_url,
        status="pending",
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return _leave_to_read(app)


# Student views their leaves
@router.get("/my-leaves", response_model=list[LeaveAppRead])
async def my_leaves(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    result = await db.execute(
        select(LeaveApplication)
        .where(LeaveApplication.student_id == user.id)
        .order_by(LeaveApplication.created_at.desc())
    )
    return [_leave_to_read(la) for la in result.scalars().all()]


# HOD views pending leaves for their department
@router.get("/leave-applications", response_model=list[LeaveAppRead])
async def hod_pending_leaves(
    user: CurrentUser,
    db: DbSession,
    leave_status: str = Query("pending", alias="status"),
) -> Any:
    dept_id = await _get_hod_dept(user, db)

    result = await db.execute(
        select(LeaveApplication)
        .where(LeaveApplication.department_id == dept_id, LeaveApplication.status == leave_status)
        .order_by(LeaveApplication.created_at.desc())
    )
    return [_leave_to_read(la) for la in result.scalars().all()]


# HOD approves leave
@router.post("/leave-applications/{leave_id}/approve", response_model=LeaveAppRead)
async def approve_leave(leave_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    dept_id = await _get_hod_dept(user, db)

    result = await db.execute(
        select(LeaveApplication).where(
            LeaveApplication.id == leave_id,
            LeaveApplication.department_id == dept_id,
            LeaveApplication.status == "pending",
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave application not found")

    app.status = "approved"
    app.reviewed_by = user.id
    app.reviewed_at = datetime.now(UTC)

    # Notify student
    db.add(
        Notification(
            user_id=app.student_id,
            type="leave.approved",
            title="Leave approved",
            body=f"Your leave ({app.start_date} to {app.end_date}) has been approved by HOD.",
            link="/student/leaves",
        )
    )

    await db.commit()
    await db.refresh(app)
    return _leave_to_read(app)


# HOD rejects leave
@router.post("/leave-applications/{leave_id}/reject", response_model=LeaveAppRead)
async def reject_leave(
    leave_id: uuid.UUID,
    body: RejectBody,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    dept_id = await _get_hod_dept(user, db)

    result = await db.execute(
        select(LeaveApplication).where(
            LeaveApplication.id == leave_id,
            LeaveApplication.department_id == dept_id,
            LeaveApplication.status == "pending",
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave application not found")

    app.status = "rejected"
    app.reviewed_by = user.id
    app.reviewed_at = datetime.now(UTC)
    app.reject_reason = body.reason

    db.add(
        Notification(
            user_id=app.student_id,
            type="leave.rejected",
            title="Leave rejected",
            body=f"Your leave was rejected: {body.reason}",
            link="/student/leaves",
        )
    )

    await db.commit()
    await db.refresh(app)
    return _leave_to_read(app)


def _leave_to_read(la: LeaveApplication) -> LeaveAppRead:
    return LeaveAppRead(
        id=la.id,
        student_id=la.student_id,
        department_id=la.department_id,
        leave_type=la.leave_type,
        start_date=str(la.start_date),
        end_date=str(la.end_date),
        reason=la.reason,
        proof_url=la.proof_url,
        status=la.status,
        reviewed_by=la.reviewed_by,
        reviewed_at=str(la.reviewed_at) if la.reviewed_at else None,
        reject_reason=la.reject_reason,
        created_at=str(la.created_at),
    )
