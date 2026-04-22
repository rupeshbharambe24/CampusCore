"""Activity attendance service: request, approve, reject, backfill."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity
from app.models.activity_attendance import ActivityAttendanceRequest
from app.models.attendance import AttendanceRecord
from app.models.notification import Notification
from app.models.timetable import Period, PeriodInstance

# ---------------------------------------------------------------------------
# Submit request
# ---------------------------------------------------------------------------


async def submit_request(
    db: AsyncSession,
    student_id: uuid.UUID,
    activity_id: uuid.UUID,
    start_date: date,
    end_date: date,
    reason: str,
    proof_url: str | None = None,
) -> ActivityAttendanceRequest:
    req = ActivityAttendanceRequest(
        student_id=student_id,
        activity_id=activity_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        proof_url=proof_url,
        status="pending",
    )
    db.add(req)
    await db.flush()

    # Notify the coordinator
    activity_result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = activity_result.scalar_one_or_none()
    if activity and activity.coordinator_id:
        db.add(
            Notification(
                user_id=activity.coordinator_id,
                type="activity.request_submitted",
                title="New activity attendance request",
                body=f"A student requested activity attendance for {activity.name} ({start_date} to {end_date})",
                link=f"/activity-approvals/{req.id}",
            )
        )

    await db.commit()
    await db.refresh(req)
    return req


# ---------------------------------------------------------------------------
# Approve — backfill attendance records
# ---------------------------------------------------------------------------


async def approve_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    approver_id: uuid.UUID,
) -> ActivityAttendanceRequest | None:
    result = await db.execute(
        select(ActivityAttendanceRequest).where(ActivityAttendanceRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if req is None or req.status != "pending":
        return None

    now = datetime.now(UTC)
    req.status = "approved"
    req.approver_id = approver_id
    req.approved_at = now

    # Backfill: for every scheduled period instance in the date range
    # that overlaps this student's section, create/update attendance as "activity"
    await _backfill_activity_attendance(db, req.student_id, req.start_date, req.end_date)

    # Notify the student
    db.add(
        Notification(
            user_id=req.student_id,
            type="activity.approved",
            title="Activity attendance approved",
            body=f"Your activity attendance request ({req.start_date} to {req.end_date}) has been approved.",
            link="/attendance",
        )
    )

    await db.commit()
    await db.refresh(req)
    return req


async def _backfill_activity_attendance(
    db: AsyncSession,
    student_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> int:
    """For each scheduled period instance in the date range, set attendance to 'activity'.

    - Existing 'absent' records → upgraded to 'activity'
    - Existing 'present' records → left alone (student was in class)
    - No record → create with status='activity'
    """
    # Get student's section
    from app.models.user import Student

    student_result = await db.execute(select(Student).where(Student.user_id == student_id))
    student = student_result.scalar_one_or_none()
    if not student or not student.current_section_id:
        return 0

    # Find all scheduled period instances in the date range for this section
    instances_result = await db.execute(
        select(PeriodInstance)
        .join(Period, PeriodInstance.period_id == Period.id)
        .where(
            Period.section_id == student.current_section_id,
            PeriodInstance.date.between(start_date, end_date),
            PeriodInstance.status == "scheduled",
        )
    )
    instances = instances_result.scalars().all()

    count = 0
    for inst in instances:
        # Check existing record
        existing_result = await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.period_instance_id == inst.id,
                AttendanceRecord.student_id == student_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing is None:
            # No record → create as activity
            db.add(
                AttendanceRecord(
                    period_instance_id=inst.id,
                    student_id=student_id,
                    status="activity",
                    marked_by=None,
                )
            )
            count += 1
        elif existing.status == "absent":
            # Upgrade absent → activity
            existing.status = "activity"
            existing.edited_at = datetime.now(UTC)
            existing.edit_reason = "Activity attendance approved"
            count += 1
        # 'present' → leave alone

    return count


# ---------------------------------------------------------------------------
# Reject
# ---------------------------------------------------------------------------


async def reject_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    approver_id: uuid.UUID,
    reject_reason: str,
) -> ActivityAttendanceRequest | None:
    result = await db.execute(
        select(ActivityAttendanceRequest).where(ActivityAttendanceRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if req is None or req.status != "pending":
        return None

    req.status = "rejected"
    req.approver_id = approver_id
    req.reject_reason = reject_reason

    # Notify the student
    db.add(
        Notification(
            user_id=req.student_id,
            type="activity.rejected",
            title="Activity attendance rejected",
            body=f"Your request was rejected: {reject_reason}",
            link="/activity-requests",
        )
    )

    await db.commit()
    await db.refresh(req)
    return req


# ---------------------------------------------------------------------------
# Cancel (by student)
# ---------------------------------------------------------------------------


async def cancel_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    student_id: uuid.UUID,
) -> ActivityAttendanceRequest | None:
    result = await db.execute(
        select(ActivityAttendanceRequest).where(
            ActivityAttendanceRequest.id == request_id,
            ActivityAttendanceRequest.student_id == student_id,
            ActivityAttendanceRequest.status == "pending",
        )
    )
    req = result.scalar_one_or_none()
    if req is None:
        return None

    req.status = "cancelled"
    await db.commit()
    await db.refresh(req)
    return req
