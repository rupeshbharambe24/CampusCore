"""Attendance service: mark, edit, compute percentages."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import SectionSubject, Subject
from app.models.attendance import AttendanceRecord
from app.models.timetable import Period, PeriodInstance

# ---------------------------------------------------------------------------
# Mark attendance (bulk upsert for a period instance)
# ---------------------------------------------------------------------------


async def mark_attendance(
    db: AsyncSession,
    period_instance_id: uuid.UUID,
    marks: list[dict[str, str]],  # [{"student_id": "...", "status": "present|absent"}]
    faculty_id: uuid.UUID,
) -> int:
    """Bulk upsert attendance for a period instance.

    `marks` is a list of dicts with keys: student_id, status.
    On conflict (same instance+student), updates status + marked_by + marked_at.
    Returns count of rows upserted.
    """
    if not marks:
        return 0

    now = datetime.now(UTC)
    values = [
        {
            "period_instance_id": period_instance_id,
            "student_id": uuid.UUID(m["student_id"]),
            "status": m["status"],
            "marked_by": faculty_id,
            "marked_at": now,
        }
        for m in marks
    ]

    stmt = pg_insert(AttendanceRecord).values(values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_attendance_instance_student",
        set_={
            "status": stmt.excluded.status,
            "marked_by": stmt.excluded.marked_by,
            "marked_at": stmt.excluded.marked_at,
            "edited_at": now,
        },
    )
    result = await db.execute(stmt)
    await db.commit()
    count: int = getattr(result, "rowcount", 0) or 0
    return count


# ---------------------------------------------------------------------------
# Edit a single record (with reason)
# ---------------------------------------------------------------------------


async def edit_attendance(
    db: AsyncSession,
    record_id: uuid.UUID,
    new_status: str,
    reason: str,
    editor_id: uuid.UUID,
) -> AttendanceRecord | None:
    """Edit a single attendance record, recording the edit reason."""
    result = await db.execute(select(AttendanceRecord).where(AttendanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if record is None:
        return None

    record.status = new_status
    record.edited_at = datetime.now(UTC)
    record.edit_reason = reason
    record.marked_by = editor_id
    await db.commit()
    await db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Attendance percentage computation
# ---------------------------------------------------------------------------


class SubjectAttendance:
    def __init__(
        self,
        subject_id: uuid.UUID,
        subject_code: str,
        subject_name: str,
        total: int,
        present: int,
        activity: int,
        absent: int,
    ) -> None:
        self.subject_id = subject_id
        self.subject_code = subject_code
        self.subject_name = subject_name
        self.total = total
        self.present = present
        self.activity = activity
        self.absent = absent

    @property
    def percentage(self) -> float:
        """(present + activity) / total * 100"""
        if self.total == 0:
            return 0.0
        return round((self.present + self.activity) / self.total * 100, 2)

    @property
    def lecture_percentage(self) -> float:
        """present / total * 100 (excludes activity attendance)"""
        if self.total == 0:
            return 0.0
        return round(self.present / self.total * 100, 2)


async def compute_student_attendance(
    db: AsyncSession,
    student_id: uuid.UUID,
    section_id: uuid.UUID,
) -> list[SubjectAttendance]:
    """Compute per-subject attendance for a student in their current section."""
    # Get all subjects for this section
    section_subjects = await db.execute(
        select(SectionSubject, Subject)
        .join(Subject, SectionSubject.subject_id == Subject.id)
        .where(SectionSubject.section_id == section_id)
    )
    subject_rows = section_subjects.all()

    results: list[SubjectAttendance] = []

    for _ss, subj in subject_rows:
        # Count total period instances for this subject in this section
        total_q = (
            select(func.count())
            .select_from(PeriodInstance)
            .join(Period, PeriodInstance.period_id == Period.id)
            .where(
                Period.section_id == section_id,
                Period.subject_id == subj.id,
                PeriodInstance.status == "scheduled",
            )
        )
        total_result = await db.execute(total_q)
        total = total_result.scalar_one()

        # Count attendance by status
        status_q = (
            select(
                AttendanceRecord.status,
                func.count().label("cnt"),
            )
            .join(PeriodInstance, AttendanceRecord.period_instance_id == PeriodInstance.id)
            .join(Period, PeriodInstance.period_id == Period.id)
            .where(
                AttendanceRecord.student_id == student_id,
                Period.section_id == section_id,
                Period.subject_id == subj.id,
            )
            .group_by(AttendanceRecord.status)
        )
        status_result = await db.execute(status_q)
        status_counts: dict[str, int] = {}
        for row in status_result.all():
            status_counts[row.status] = row.cnt

        results.append(
            SubjectAttendance(
                subject_id=subj.id,
                subject_code=subj.code,
                subject_name=subj.name,
                total=total,
                present=status_counts.get("present", 0),
                activity=status_counts.get("activity", 0),
                absent=status_counts.get("absent", 0),
            )
        )

    return results


async def compute_overall_attendance(
    db: AsyncSession,
    student_id: uuid.UUID,
    section_id: uuid.UUID,
) -> dict[str, object]:
    """Compute overall attendance percentages across all subjects."""
    subjects = await compute_student_attendance(db, student_id, section_id)

    total = sum(s.total for s in subjects)
    present = sum(s.present for s in subjects)
    activity = sum(s.activity for s in subjects)
    absent = sum(s.absent for s in subjects)

    pct = round((present + activity) / total * 100, 2) if total > 0 else 0.0
    lecture_pct = round(present / total * 100, 2) if total > 0 else 0.0

    below_75 = [s.subject_code for s in subjects if s.percentage < 75.0]

    return {
        "total_classes": total,
        "present": present,
        "activity": activity,
        "absent": absent,
        "overall_percentage": pct,
        "lecture_only_percentage": lecture_pct,
        "subjects_below_75": below_75,
        "subjects_below_75_count": len(below_75),
    }
