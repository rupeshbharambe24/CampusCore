"""Attendance endpoints: faculty marks, student views."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import AttendanceRecord, Period, PeriodInstance, UserRole
from app.models.user import Student, User
from app.schemas.attendance import (
    AttendanceRecordRead,
    AttendanceSummary,
    EditAttendanceRequest,
    RosterEntry,
    SubjectAttendanceRead,
    SubmitAttendanceRequest,
    SubmitAttendanceResponse,
)
from app.services.attendance import (
    compute_overall_attendance,
    compute_student_attendance,
    edit_attendance,
    mark_attendance,
)

router = APIRouter(tags=["attendance"])


# ---------------------------------------------------------------------------
# Faculty: get roster for a period instance
# ---------------------------------------------------------------------------


@router.get(
    "/faculty/me/period-instances/{instance_id}/roster",
    response_model=list[RosterEntry],
)
async def get_roster(
    instance_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    # Verify the instance exists and belongs to this faculty
    inst_result = await db.execute(select(PeriodInstance).where(PeriodInstance.id == instance_id))
    instance = inst_result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Period instance not found")

    period_result = await db.execute(select(Period).where(Period.id == instance.period_id))
    period = period_result.scalar_one()

    if period.faculty_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your class")

    if instance.status == "cancelled":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Class is cancelled")

    # Build roster: students in the section (+ lab batch filter if applicable)
    query = (
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.current_section_id == period.section_id)
    )
    if period.lab_batch:
        query = query.where(Student.lab_batch == period.lab_batch)

    query = query.order_by(Student.roll_number)
    students_result = await db.execute(query)

    # Check existing marks
    marks_result = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.period_instance_id == instance_id)
    )
    marks_by_student: dict[uuid.UUID, str] = {
        r.student_id: r.status for r in marks_result.scalars().all()
    }

    roster: list[RosterEntry] = []
    for student, u in students_result.all():
        roster.append(
            RosterEntry(
                student_id=student.user_id,
                roll_number=student.roll_number,
                full_name=u.full_name,
                lab_batch=student.lab_batch,
                status=marks_by_student.get(student.user_id),
            )
        )

    return roster


# ---------------------------------------------------------------------------
# Faculty: submit attendance for a period instance
# ---------------------------------------------------------------------------


@router.post(
    "/faculty/me/period-instances/{instance_id}/attendance",
    response_model=SubmitAttendanceResponse,
)
async def submit_attendance(
    instance_id: uuid.UUID,
    body: SubmitAttendanceRequest,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    # Verify instance + ownership
    inst_result = await db.execute(select(PeriodInstance).where(PeriodInstance.id == instance_id))
    instance = inst_result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Period instance not found")

    period_result = await db.execute(select(Period).where(Period.id == instance.period_id))
    period = period_result.scalar_one()

    if period.faculty_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your class")

    if instance.status == "cancelled":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Class is cancelled")

    marks = [{"student_id": str(m.student_id), "status": m.status} for m in body.marks]
    count = await mark_attendance(db, instance_id, marks, user.id)

    return SubmitAttendanceResponse(period_instance_id=instance_id, upserted=count)


# ---------------------------------------------------------------------------
# Faculty: edit a single attendance record
# ---------------------------------------------------------------------------


@router.patch(
    "/faculty/me/attendance/{record_id}",
    response_model=AttendanceRecordRead,
)
async def edit_attendance_record(
    record_id: uuid.UUID,
    body: EditAttendanceRequest,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    record = await edit_attendance(db, record_id, body.status, body.reason, user.id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found")

    return AttendanceRecordRead.model_validate(record)


# ---------------------------------------------------------------------------
# Student: attendance summary
# ---------------------------------------------------------------------------


@router.get("/students/me/attendance/summary", response_model=AttendanceSummary)
async def student_attendance_summary(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    student_result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = student_result.scalar_one_or_none()
    if not student or not student.current_section_id:
        return AttendanceSummary(
            total_classes=0,
            present=0,
            activity=0,
            absent=0,
            overall_percentage=0.0,
            lecture_only_percentage=0.0,
            subjects_below_75=[],
            subjects_below_75_count=0,
        )

    summary = await compute_overall_attendance(db, student.user_id, student.current_section_id)
    return AttendanceSummary(**summary)


# ---------------------------------------------------------------------------
# Student: per-subject attendance
# ---------------------------------------------------------------------------


@router.get(
    "/students/me/attendance/by-subject",
    response_model=list[SubjectAttendanceRead],
)
async def student_attendance_by_subject(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    student_result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = student_result.scalar_one_or_none()
    if not student or not student.current_section_id:
        return []

    subjects = await compute_student_attendance(db, student.user_id, student.current_section_id)
    return [
        SubjectAttendanceRead(
            subject_id=s.subject_id,
            subject_code=s.subject_code,
            subject_name=s.subject_name,
            total=s.total,
            present=s.present,
            activity=s.activity,
            absent=s.absent,
            percentage=s.percentage,
            lecture_percentage=s.lecture_percentage,
        )
        for s in subjects
    ]
