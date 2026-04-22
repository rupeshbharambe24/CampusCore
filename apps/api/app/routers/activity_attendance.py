"""Activity attendance + notification endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, update

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.activity import Activity
from app.models.activity_attendance import ActivityAttendanceRequest
from app.models.notification import Notification
from app.schemas.activity_attendance import (
    ActivityRequestCreate,
    ActivityRequestRead,
    NotificationRead,
    RejectRequest,
)
from app.services.activity_attendance import (
    approve_request,
    cancel_request,
    reject_request,
    submit_request,
)

router = APIRouter(tags=["activity-attendance"])


# ---------------------------------------------------------------------------
# Student: submit + view requests
# ---------------------------------------------------------------------------


@router.post(
    "/students/me/activity-requests",
    status_code=201,
    response_model=ActivityRequestRead,
)
async def create_activity_request(
    body: ActivityRequestCreate,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    req = await submit_request(
        db,
        student_id=user.id,
        activity_id=body.activity_id,
        start_date=body.start_date,
        end_date=body.end_date,
        reason=body.reason,
        proof_url=body.proof_url,
    )
    return ActivityRequestRead.model_validate(req)


@router.get(
    "/students/me/activity-requests",
    response_model=list[ActivityRequestRead],
)
async def list_my_activity_requests(
    user: CurrentUser,
    db: DbSession,
    request_status: str | None = Query(None, alias="status"),
) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    query = (
        select(ActivityAttendanceRequest)
        .where(ActivityAttendanceRequest.student_id == user.id)
        .order_by(ActivityAttendanceRequest.created_at.desc())
    )

    if request_status:
        query = query.where(ActivityAttendanceRequest.status == request_status)

    result = await db.execute(query)
    return [ActivityRequestRead.model_validate(r) for r in result.scalars().all()]


@router.post(
    "/students/me/activity-requests/{request_id}/cancel",
    response_model=ActivityRequestRead,
)
async def cancel_my_request(
    request_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    req = await cancel_request(db, request_id, user.id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found or not cancellable")
    return ActivityRequestRead.model_validate(req)


# ---------------------------------------------------------------------------
# Coordinator: approve / reject
# ---------------------------------------------------------------------------


@router.get(
    "/faculty/me/activity-approvals",
    response_model=list[ActivityRequestRead],
)
async def list_pending_approvals(
    user: CurrentUser,
    db: DbSession,
    request_status: str = Query("pending", alias="status"),
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    # Find activities where this faculty is coordinator
    activities_result = await db.execute(
        select(Activity.id).where(Activity.coordinator_id == user.id)
    )
    activity_ids = list(activities_result.scalars().all())

    if not activity_ids:
        return []

    query = (
        select(ActivityAttendanceRequest)
        .where(
            ActivityAttendanceRequest.activity_id.in_(activity_ids),
            ActivityAttendanceRequest.status == request_status,
        )
        .order_by(ActivityAttendanceRequest.created_at.desc())
    )
    result = await db.execute(query)
    return [ActivityRequestRead.model_validate(r) for r in result.scalars().all()]


@router.post(
    "/faculty/me/activity-approvals/{request_id}/approve",
    response_model=ActivityRequestRead,
)
async def approve_activity_request(
    request_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    req = await approve_request(db, request_id, user.id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found or not pending")
    return ActivityRequestRead.model_validate(req)


@router.post(
    "/faculty/me/activity-approvals/{request_id}/reject",
    response_model=ActivityRequestRead,
)
async def reject_activity_request(
    request_id: uuid.UUID,
    body: RejectRequest,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    req = await reject_request(db, request_id, user.id, body.reason)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found or not pending")
    return ActivityRequestRead.model_validate(req)


# ---------------------------------------------------------------------------
# Notifications (all users)
# ---------------------------------------------------------------------------


@router.get("/me/notifications", response_model=list[NotificationRead])
async def list_notifications(
    user: CurrentUser,
    db: DbSession,
    unread_only: bool = Query(False),
) -> Any:
    query = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    if unread_only:
        query = query.where(Notification.is_read.is_(False))

    result = await db.execute(query)
    return [NotificationRead.model_validate(n) for n in result.scalars().all()]


@router.post("/me/notifications/read-all", status_code=204)
async def mark_all_read(user: CurrentUser, db: DbSession) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
