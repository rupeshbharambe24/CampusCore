"""Admin report queries: section attendance, below-75%, faculty compliance, activity summary."""

import uuid
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity
from app.models.activity_attendance import ActivityAttendanceRequest
from app.models.attendance import AttendanceRecord
from app.models.timetable import Period, PeriodInstance
from app.models.user import Student, User


async def section_attendance_report(
    db: AsyncSession,
    section_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    """Per-student attendance summary for a section."""
    students_result = await db.execute(
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.current_section_id == section_id)
        .order_by(Student.roll_number)
    )

    # Get total scheduled instances for this section in date range
    total_q = (
        select(func.count())
        .select_from(PeriodInstance)
        .join(Period, PeriodInstance.period_id == Period.id)
        .where(Period.section_id == section_id, PeriodInstance.status == "scheduled")
    )
    if start_date:
        total_q = total_q.where(PeriodInstance.date >= start_date)
    if end_date:
        total_q = total_q.where(PeriodInstance.date <= end_date)
    total_result = await db.execute(total_q)
    total_classes = total_result.scalar_one()

    rows: list[dict[str, Any]] = []
    for student, user in students_result.all():
        att_q = (
            select(AttendanceRecord.status, func.count().label("cnt"))
            .join(PeriodInstance, AttendanceRecord.period_instance_id == PeriodInstance.id)
            .join(Period, PeriodInstance.period_id == Period.id)
            .where(
                AttendanceRecord.student_id == student.user_id,
                Period.section_id == section_id,
            )
        )
        if start_date:
            att_q = att_q.where(PeriodInstance.date >= start_date)
        if end_date:
            att_q = att_q.where(PeriodInstance.date <= end_date)
        att_q = att_q.group_by(AttendanceRecord.status)

        att_result = await db.execute(att_q)
        counts: dict[str, int] = {r.status: r.cnt for r in att_result.all()}

        present = counts.get("present", 0)
        activity = counts.get("activity", 0)
        absent = counts.get("absent", 0)
        pct = round((present + activity) / total_classes * 100, 2) if total_classes > 0 else 0.0

        rows.append(
            {
                "student_id": str(student.user_id),
                "roll_number": student.roll_number,
                "full_name": user.full_name,
                "total_classes": total_classes,
                "present": present,
                "activity": activity,
                "absent": absent,
                "percentage": pct,
            }
        )

    return rows


async def below_threshold_report(
    db: AsyncSession,
    section_id: uuid.UUID | None = None,
    threshold: float = 75.0,
) -> list[dict[str, Any]]:
    """Students below the attendance threshold. Optionally filtered by section."""
    student_q = select(Student, User).join(User, Student.user_id == User.id)
    if section_id:
        student_q = student_q.where(Student.current_section_id == section_id)
    student_q = student_q.order_by(Student.roll_number)

    students_result = await db.execute(student_q)
    rows: list[dict[str, Any]] = []

    for student, user in students_result.all():
        if not student.current_section_id:
            continue

        # Total for student's section
        total_result = await db.execute(
            select(func.count())
            .select_from(PeriodInstance)
            .join(Period, PeriodInstance.period_id == Period.id)
            .where(
                Period.section_id == student.current_section_id,
                PeriodInstance.status == "scheduled",
            )
        )
        total = total_result.scalar_one()
        if total == 0:
            continue

        # Student's present+activity count
        att_result = await db.execute(
            select(func.count())
            .select_from(AttendanceRecord)
            .join(PeriodInstance, AttendanceRecord.period_instance_id == PeriodInstance.id)
            .join(Period, PeriodInstance.period_id == Period.id)
            .where(
                AttendanceRecord.student_id == student.user_id,
                Period.section_id == student.current_section_id,
                AttendanceRecord.status.in_(["present", "activity"]),
            )
        )
        attended = att_result.scalar_one()
        pct = round(attended / total * 100, 2)

        if pct < threshold:
            rows.append(
                {
                    "student_id": str(student.user_id),
                    "roll_number": student.roll_number,
                    "full_name": user.full_name,
                    "total_classes": total,
                    "attended": attended,
                    "percentage": pct,
                }
            )

    return rows


async def faculty_compliance_report(
    db: AsyncSession,
    semester_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Which faculty have unmarked period instances."""
    # Get all faculty with periods this semester
    faculty_periods = await db.execute(
        select(
            Period.faculty_id,
            func.count(PeriodInstance.id).label("total_instances"),
        )
        .join(PeriodInstance, PeriodInstance.period_id == Period.id)
        .where(Period.semester_id == semester_id, PeriodInstance.status == "scheduled")
        .group_by(Period.faculty_id)
    )

    rows: list[dict[str, Any]] = []
    for fac_id, total_instances in faculty_periods.all():
        # Count instances that have at least one attendance record
        marked_result = await db.execute(
            select(func.count(func.distinct(AttendanceRecord.period_instance_id)))
            .join(PeriodInstance, AttendanceRecord.period_instance_id == PeriodInstance.id)
            .join(Period, PeriodInstance.period_id == Period.id)
            .where(Period.faculty_id == fac_id, Period.semester_id == semester_id)
        )
        marked = marked_result.scalar_one()

        # Get faculty name
        user_result = await db.execute(select(User).where(User.id == fac_id))
        user = user_result.scalar_one()

        rows.append(
            {
                "faculty_id": str(fac_id),
                "full_name": user.full_name,
                "total_instances": total_instances,
                "marked": marked,
                "unmarked": total_instances - marked,
                "compliance_pct": round(marked / total_instances * 100, 2)
                if total_instances > 0
                else 0.0,
            }
        )

    return sorted(rows, key=lambda r: r["compliance_pct"])


async def activity_summary_report(db: AsyncSession) -> list[dict[str, Any]]:
    """Summary of activity attendance requests by activity."""
    result = await db.execute(
        select(
            Activity.id,
            Activity.name,
            ActivityAttendanceRequest.status,
            func.count().label("cnt"),
        )
        .join(ActivityAttendanceRequest, ActivityAttendanceRequest.activity_id == Activity.id)
        .group_by(Activity.id, Activity.name, ActivityAttendanceRequest.status)
        .order_by(Activity.name)
    )

    # Pivot by activity
    by_activity: dict[str, dict[str, Any]] = {}
    for act_id, act_name, req_status, cnt in result.all():
        key = str(act_id)
        if key not in by_activity:
            by_activity[key] = {
                "activity_id": key,
                "activity_name": act_name,
                "pending": 0,
                "approved": 0,
                "rejected": 0,
                "cancelled": 0,
                "total": 0,
            }
        by_activity[key][req_status] = cnt
        by_activity[key]["total"] += cnt

    return list(by_activity.values())
