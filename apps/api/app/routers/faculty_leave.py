"""Faculty leave endpoints — faculty applies, HOD approves."""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.faculty_leave import FacultyLeave
from app.models.notification import Notification
from app.models.user import Faculty

router = APIRouter(tags=["faculty-leave"])


class FacLeaveCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str = Field(min_length=3, max_length=512)


class FacLeaveRead(BaseModel):
    id: uuid.UUID
    faculty_id: uuid.UUID
    department_id: uuid.UUID
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    reviewed_by: uuid.UUID | None
    reviewed_at: str | None
    reject_reason: str | None
    created_at: str
    model_config = {"from_attributes": True}


class RejectBody(BaseModel):
    reason: str = Field(min_length=3, max_length=256)


# Faculty submits leave
@router.post("/faculty/me/leaves", status_code=201, response_model=FacLeaveRead)
async def submit_faculty_leave(body: FacLeaveCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    fac_result = await db.execute(select(Faculty).where(Faculty.user_id == user.id))
    fac = fac_result.scalar_one_or_none()
    if not fac:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Faculty profile not found")
    leave = FacultyLeave(
        faculty_id=user.id, department_id=fac.department_id, **body.model_dump(), status="pending"
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return FacLeaveRead.model_validate(leave)


# Faculty views own leaves
@router.get("/faculty/me/leaves", response_model=list[FacLeaveRead])
async def my_faculty_leaves(user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(
        select(FacultyLeave)
        .where(FacultyLeave.faculty_id == user.id)
        .order_by(FacultyLeave.created_at.desc())
    )
    return [FacLeaveRead.model_validate(lv) for lv in result.scalars().all()]


# HOD views pending faculty leaves for their dept
@router.get("/hod/faculty-leaves", response_model=list[FacLeaveRead])
async def hod_faculty_leaves(
    user: CurrentUser,
    db: DbSession,
    leave_status: str = Query("pending", alias="status"),
) -> Any:
    if user.role != UserRole.HOD:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    fac_result = await db.execute(select(Faculty).where(Faculty.user_id == user.id))
    fac = fac_result.scalar_one_or_none()
    if not fac:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(
        select(FacultyLeave)
        .where(FacultyLeave.department_id == fac.department_id, FacultyLeave.status == leave_status)
        .order_by(FacultyLeave.created_at.desc())
    )
    return [FacLeaveRead.model_validate(lv) for lv in result.scalars().all()]


# HOD approves
@router.post("/hod/faculty-leaves/{leave_id}/approve", response_model=FacLeaveRead)
async def approve_faculty_leave(leave_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.HOD:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(
        select(FacultyLeave).where(FacultyLeave.id == leave_id, FacultyLeave.status == "pending")
    )
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    leave.status = "approved"
    leave.reviewed_by = user.id
    leave.reviewed_at = datetime.now(UTC)
    db.add(
        Notification(
            user_id=leave.faculty_id,
            type="faculty_leave.approved",
            title="Leave approved",
            body=f"Your leave ({leave.start_date} to {leave.end_date}) has been approved.",
            link="/faculty/my-leaves",
        )
    )
    await db.commit()
    await db.refresh(leave)
    return FacLeaveRead.model_validate(leave)


# HOD rejects
@router.post("/hod/faculty-leaves/{leave_id}/reject", response_model=FacLeaveRead)
async def reject_faculty_leave(
    leave_id: uuid.UUID, body: RejectBody, user: CurrentUser, db: DbSession
) -> Any:
    if user.role != UserRole.HOD:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(
        select(FacultyLeave).where(FacultyLeave.id == leave_id, FacultyLeave.status == "pending")
    )
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    leave.status = "rejected"
    leave.reviewed_by = user.id
    leave.reviewed_at = datetime.now(UTC)
    leave.reject_reason = body.reason
    db.add(
        Notification(
            user_id=leave.faculty_id,
            type="faculty_leave.rejected",
            title="Leave rejected",
            body=f"Your leave was rejected: {body.reason}",
            link="/faculty/my-leaves",
        )
    )
    await db.commit()
    await db.refresh(leave)
    return FacLeaveRead.model_validate(leave)
