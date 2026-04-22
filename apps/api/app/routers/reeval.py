"""Re-evaluation request endpoints (class test / mid-sem only)."""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import ReEvalRequest, UserRole
from app.models.notification import Notification

router = APIRouter(tags=["reeval"])


class ReEvalCreate(BaseModel):
    exam_id: uuid.UUID
    subject_id: uuid.UUID
    reason: str = Field(min_length=3, max_length=512)


class ReEvalRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    exam_id: uuid.UUID
    subject_id: uuid.UUID
    reason: str
    status: str
    reviewed_by: uuid.UUID | None
    reviewed_at: str | None
    new_marks: str | None
    reject_reason: str | None
    created_at: str

    model_config = {"from_attributes": True}


class ResolveBody(BaseModel):
    new_marks: str | None = None
    reject_reason: str | None = None


# Student submits re-eval request
@router.post("/students/me/reeval-requests", status_code=201, response_model=ReEvalRead)
async def submit_reeval(body: ReEvalCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    req = ReEvalRequest(student_id=user.id, **body.model_dump(), status="pending")
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return ReEvalRead.model_validate(req)


# Student views own requests
@router.get("/students/me/reeval-requests", response_model=list[ReEvalRead])
async def my_reeval_requests(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(
        select(ReEvalRequest)
        .where(ReEvalRequest.student_id == user.id)
        .order_by(ReEvalRequest.created_at.desc())
    )
    return [ReEvalRead.model_validate(r) for r in result.scalars().all()]


# Faculty/HOD views pending re-evals
@router.get("/faculty/reeval-requests", response_model=list[ReEvalRead])
async def list_reeval_requests(
    user: CurrentUser,
    db: DbSession,
    req_status: str = Query("pending", alias="status"),
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(
        select(ReEvalRequest)
        .where(ReEvalRequest.status == req_status)
        .order_by(ReEvalRequest.created_at.desc())
    )
    return [ReEvalRead.model_validate(r) for r in result.scalars().all()]


# Faculty approves (resolves with new marks)
@router.post("/faculty/reeval-requests/{request_id}/resolve", response_model=ReEvalRead)
async def resolve_reeval(
    request_id: uuid.UUID, body: ResolveBody, user: CurrentUser, db: DbSession
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(
        select(ReEvalRequest).where(
            ReEvalRequest.id == request_id, ReEvalRequest.status == "pending"
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    req.status = "resolved" if body.new_marks else "rejected"
    req.reviewed_by = user.id
    req.reviewed_at = datetime.now(UTC)
    req.new_marks = body.new_marks
    req.reject_reason = body.reject_reason

    db.add(
        Notification(
            user_id=req.student_id,
            type=f"reeval.{req.status}",
            title=f"Re-evaluation {req.status}",
            body=f"Your re-evaluation request has been {req.status}."
            + (f" New marks: {body.new_marks}" if body.new_marks else ""),
            link="/student/exams",
        )
    )

    await db.commit()
    await db.refresh(req)
    return ReEvalRead.model_validate(req)
