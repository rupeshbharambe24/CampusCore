"""Timetable endpoints: admin CRUD + student/faculty read views."""

import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import (
    Period,
    PeriodInstance,
    Room,
    Subject,
    UserRole,
)
from app.models.academic import TimetableSlot
from app.models.timetable import Holiday, PeriodExtraSection
from app.models.user import Student, User
from app.schemas.timetable import (
    CancelInstanceRequest,
    CollisionRead,
    GenerateInstancesRequest,
    GenerateInstancesResponse,
    HolidayCreate,
    HolidayRead,
    PeriodCreate,
    PeriodInstanceRead,
    PeriodRead,
    TimetableEntry,
)
from app.services.timetable import detect_collisions, generate_instances

router = APIRouter(tags=["timetable"])

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HOD}


def _require_admin(user: User) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")


# ---------------------------------------------------------------------------
# Periods (admin)
# ---------------------------------------------------------------------------


@router.post("/admin/periods", status_code=201, response_model=PeriodRead)
async def create_period(body: PeriodCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)

    period = Period(
        semester_id=body.semester_id,
        section_id=body.section_id,
        timetable_slot_id=body.timetable_slot_id,
        subject_id=body.subject_id,
        faculty_id=body.faculty_id,
        room_id=body.room_id,
        period_type=body.period_type,
        lab_batch=body.lab_batch,
        is_elective_bundle=body.is_elective_bundle,
        valid_from=body.valid_from,
        valid_to=body.valid_to,
    )
    db.add(period)
    await db.flush()

    # Add extra sections for elective/aptitude bundles
    for extra_section_id in body.extra_section_ids:
        db.add(PeriodExtraSection(period_id=period.id, section_id=extra_section_id))

    await db.commit()
    await db.refresh(period)
    return PeriodRead.model_validate(period)


@router.get("/admin/periods", response_model=list[PeriodRead])
async def list_periods(
    user: CurrentUser,
    db: DbSession,
    semester_id: uuid.UUID = Query(...),
    section_id: uuid.UUID | None = Query(None),
) -> Any:
    _require_admin(user)
    query = select(Period).where(Period.semester_id == semester_id)
    if section_id:
        query = query.where(Period.section_id == section_id)
    result = await db.execute(query)
    return [PeriodRead.model_validate(p) for p in result.scalars().all()]


@router.delete("/admin/periods/{period_id}", status_code=204)
async def delete_period(period_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    result = await db.execute(select(Period).where(Period.id == period_id))
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Period not found")
    await db.delete(period)
    await db.commit()


# ---------------------------------------------------------------------------
# Collision check (admin)
# ---------------------------------------------------------------------------


@router.get("/admin/periods/collisions", response_model=list[CollisionRead])
async def check_collisions(
    user: CurrentUser,
    db: DbSession,
    semester_id: uuid.UUID = Query(...),
) -> Any:
    _require_admin(user)
    collisions = await detect_collisions(db, semester_id)
    return [
        CollisionRead(
            kind=c.kind,
            period_id=c.period_id,
            conflicting_period_id=c.conflicting_period_id,
            detail=c.detail,
        )
        for c in collisions
    ]


# ---------------------------------------------------------------------------
# Period instances (admin)
# ---------------------------------------------------------------------------


@router.post("/admin/timetable/generate-instances", response_model=GenerateInstancesResponse)
async def generate_period_instances(
    body: GenerateInstancesRequest,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    _require_admin(user)
    count = await generate_instances(db, body.semester_id, body.start_date, body.end_date)
    return GenerateInstancesResponse(created=count)


@router.post("/admin/period-instances/{instance_id}/cancel", response_model=PeriodInstanceRead)
async def cancel_period_instance(
    instance_id: uuid.UUID,
    body: CancelInstanceRequest,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    _require_admin(user)
    result = await db.execute(select(PeriodInstance).where(PeriodInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Instance not found")
    instance.status = "cancelled"
    instance.cancelled_reason = body.reason
    await db.commit()
    await db.refresh(instance)
    return PeriodInstanceRead.model_validate(instance)


# ---------------------------------------------------------------------------
# Holidays (admin)
# ---------------------------------------------------------------------------


@router.get("/admin/holidays", response_model=list[HolidayRead])
async def list_holidays(user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    result = await db.execute(select(Holiday).order_by(Holiday.date))
    return [HolidayRead.model_validate(h) for h in result.scalars().all()]


@router.post("/admin/holidays", status_code=201, response_model=HolidayRead)
async def create_holiday(body: HolidayCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    holiday = Holiday(date=body.date, reason=body.reason)
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)
    return HolidayRead.model_validate(holiday)


@router.delete("/admin/holidays/{holiday_id}", status_code=204)
async def delete_holiday(holiday_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    result = await db.execute(select(Holiday).where(Holiday.id == holiday_id))
    holiday = result.scalar_one_or_none()
    if not holiday:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Holiday not found")
    await db.delete(holiday)
    await db.commit()


# ---------------------------------------------------------------------------
# Student timetable (read-only)
# ---------------------------------------------------------------------------


async def _build_timetable_entries(
    db: AsyncSession,
    periods: list[Any],
    target_date: date | None = None,
) -> list[TimetableEntry]:
    """Build TimetableEntry list from Period rows with joined slot/subject/faculty/room."""
    entries: list[TimetableEntry] = []
    for row in periods:
        period = row[0] if isinstance(row, tuple) else row
        slot_result = await db.execute(
            select(TimetableSlot).where(TimetableSlot.id == period.timetable_slot_id)
        )
        slot = slot_result.scalar_one()
        subj_result = await db.execute(select(Subject).where(Subject.id == period.subject_id))
        subj = subj_result.scalar_one()
        fac_result = await db.execute(select(User).where(User.id == period.faculty_id))
        fac = fac_result.scalar_one()

        room_name: str | None = None
        if period.room_id:
            room_result = await db.execute(select(Room).where(Room.id == period.room_id))
            room = room_result.scalar_one_or_none()
            room_name = f"{room.building} {room.name}" if room else None

        # Check instance status if date provided
        inst_status = "scheduled"
        inst_id: uuid.UUID | None = None
        if target_date:
            inst_result = await db.execute(
                select(PeriodInstance).where(
                    PeriodInstance.period_id == period.id,
                    PeriodInstance.date == target_date,
                )
            )
            inst = inst_result.scalar_one_or_none()
            if inst:
                inst_status = inst.status
                inst_id = inst.id

        entries.append(
            TimetableEntry(
                period_id=period.id,
                instance_id=inst_id,
                day_of_week=slot.day_of_week,
                start_time=slot.start_time,
                end_time=slot.end_time,
                slot_label=slot.slot_label,
                subject_code=subj.code,
                subject_name=subj.name,
                faculty_name=fac.full_name,
                room_name=room_name,
                period_type=period.period_type,
                lab_batch=period.lab_batch,
                status=inst_status,
            )
        )

    return sorted(entries, key=lambda e: (e.day_of_week, e.start_time))


@router.get("/students/me/timetable", response_model=list[TimetableEntry])
async def student_timetable(
    user: CurrentUser,
    db: DbSession,
    target_date: date | None = Query(None, alias="date"),
) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students only")

    # Get student's current section
    student_result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = student_result.scalar_one_or_none()
    if not student or not student.current_section_id:
        return []

    # Get active periods for student's section
    today = target_date or date.today()
    periods_result = await db.execute(
        select(Period).where(
            Period.section_id == student.current_section_id,
            Period.valid_from <= today,
            (Period.valid_to.is_(None)) | (Period.valid_to >= today),
        )
    )
    periods = [(p,) for p in periods_result.scalars().all()]

    return await _build_timetable_entries(db, periods, target_date)


# ---------------------------------------------------------------------------
# Faculty timetable (read-only)
# ---------------------------------------------------------------------------


@router.get("/faculty/me/today", response_model=list[TimetableEntry])
async def faculty_today(user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    today = date.today()
    weekday = today.weekday()

    # Get today's slots
    slots_result = await db.execute(
        select(TimetableSlot).where(TimetableSlot.day_of_week == weekday)
    )
    today_slot_ids = [s.id for s in slots_result.scalars().all()]

    if not today_slot_ids:
        return []

    periods_result = await db.execute(
        select(Period).where(
            Period.faculty_id == user.id,
            Period.timetable_slot_id.in_(today_slot_ids),
            Period.valid_from <= today,
            (Period.valid_to.is_(None)) | (Period.valid_to >= today),
        )
    )
    periods = [(p,) for p in periods_result.scalars().all()]

    return await _build_timetable_entries(db, periods, today)


@router.get("/faculty/me/timetable", response_model=list[TimetableEntry])
async def faculty_timetable(user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty only")

    today = date.today()
    periods_result = await db.execute(
        select(Period).where(
            Period.faculty_id == user.id,
            Period.valid_from <= today,
            (Period.valid_to.is_(None)) | (Period.valid_to >= today),
        )
    )
    periods = [(p,) for p in periods_result.scalars().all()]

    return await _build_timetable_entries(db, periods)
