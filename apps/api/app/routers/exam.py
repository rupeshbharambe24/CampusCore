"""Exam management endpoints: CRUD, results, seating, schedules."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import (
    Exam,
    ExamResult,
    ExamSchedule,
    SeatingArrangement,
    UserRole,
)
from app.models.academic import Room, Subject
from app.models.user import Student, User
from app.services.seating import generate_seating

router = APIRouter(tags=["exams"])

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HOD}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ExamCreate(BaseModel):
    semester_id: uuid.UUID
    name: str = Field(max_length=128)
    exam_type: str
    max_marks: int = 20


class ExamRead(BaseModel):
    id: uuid.UUID
    semester_id: uuid.UUID
    name: str
    exam_type: str
    max_marks: int
    is_published: bool
    model_config = {"from_attributes": True}


class ScheduleCreate(BaseModel):
    exam_id: uuid.UUID
    subject_id: uuid.UUID
    exam_date: str
    start_time: str
    end_time: str
    sections: str | None = None


class ScheduleRead(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    subject_id: uuid.UUID
    exam_date: str
    start_time: str
    end_time: str
    sections: str | None
    model_config = {"from_attributes": True}


class ResultEntry(BaseModel):
    student_id: uuid.UUID
    marks_obtained: float
    is_absent: bool = False


class BulkResultsRequest(BaseModel):
    exam_id: uuid.UUID
    subject_id: uuid.UUID
    results: list[ResultEntry]


class ResultRead(BaseModel):
    student_id: uuid.UUID
    student_name: str
    roll_number: str
    marks_obtained: float
    is_absent: bool
    rank_in_section: int | None
    rank_in_branch: int | None


class GenerateSeatingRequest(BaseModel):
    exam_schedule_id: uuid.UUID
    room_ids: list[uuid.UUID]
    is_exam: bool = True


class SeatRead(BaseModel):
    student_id: uuid.UUID
    student_name: str
    roll_number: str
    room_name: str
    building: str
    seat_number: int
    bench_number: int | None


# ---------------------------------------------------------------------------
# Admin: Exam CRUD
# ---------------------------------------------------------------------------


@router.post("/admin/exams", status_code=201, response_model=ExamRead)
async def create_exam(body: ExamCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    exam = Exam(**body.model_dump())
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return ExamRead.model_validate(exam)


@router.get("/admin/exams", response_model=list[ExamRead])
async def list_exams(
    user: CurrentUser,
    db: DbSession,
    semester_id: uuid.UUID = Query(...),
) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(Exam).where(Exam.semester_id == semester_id))
    return [ExamRead.model_validate(e) for e in result.scalars().all()]


@router.post("/admin/exams/{exam_id}/publish", response_model=ExamRead)
async def publish_exam(exam_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    exam.is_published = True
    await db.commit()
    await db.refresh(exam)
    return ExamRead.model_validate(exam)


# ---------------------------------------------------------------------------
# Admin: Exam Schedule
# ---------------------------------------------------------------------------


@router.post("/admin/exam-schedules", status_code=201, response_model=ScheduleRead)
async def create_schedule(body: ScheduleCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    sched = ExamSchedule(**body.model_dump())
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return ScheduleRead.model_validate(sched)


@router.get("/admin/exam-schedules", response_model=list[ScheduleRead])
async def list_schedules(
    user: CurrentUser,
    db: DbSession,
    exam_id: uuid.UUID = Query(...),
) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(ExamSchedule).where(ExamSchedule.exam_id == exam_id))
    return [ScheduleRead.model_validate(s) for s in result.scalars().all()]


# ---------------------------------------------------------------------------
# Faculty: Enter results
# ---------------------------------------------------------------------------


@router.post("/faculty/exam-results", status_code=201)
async def submit_results(body: BulkResultsRequest, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD, *ADMIN_ROLES):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    for entry in body.results:
        existing = await db.execute(
            select(ExamResult).where(
                ExamResult.exam_id == body.exam_id,
                ExamResult.subject_id == body.subject_id,
                ExamResult.student_id == entry.student_id,
            )
        )
        result = existing.scalar_one_or_none()
        if result:
            result.marks_obtained = entry.marks_obtained
            result.is_absent = entry.is_absent
        else:
            db.add(
                ExamResult(
                    exam_id=body.exam_id,
                    subject_id=body.subject_id,
                    student_id=entry.student_id,
                    marks_obtained=entry.marks_obtained,
                    is_absent=entry.is_absent,
                )
            )

    await db.flush()

    # Auto-compute rankings
    all_results = await db.execute(
        select(ExamResult)
        .where(ExamResult.exam_id == body.exam_id, ExamResult.subject_id == body.subject_id)
        .order_by(ExamResult.marks_obtained.desc())
    )
    results_list = list(all_results.scalars().all())
    for rank, r in enumerate(results_list, 1):
        r.rank_in_branch = rank  # simplified: same as overall for now

    await db.commit()
    return {"message": f"Saved {len(body.results)} results"}


# ---------------------------------------------------------------------------
# View results (student + faculty + admin)
# ---------------------------------------------------------------------------


@router.get("/exams/{exam_id}/results/{subject_id}", response_model=list[ResultRead])
async def get_results(
    exam_id: uuid.UUID,
    subject_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    result = await db.execute(
        select(ExamResult, Student, User)
        .join(Student, ExamResult.student_id == Student.user_id)
        .join(User, Student.user_id == User.id)
        .where(ExamResult.exam_id == exam_id, ExamResult.subject_id == subject_id)
        .order_by(ExamResult.marks_obtained.desc())
    )
    return [
        ResultRead(
            student_id=er.student_id,
            student_name=u.full_name,
            roll_number=s.roll_number,
            marks_obtained=er.marks_obtained,
            is_absent=er.is_absent,
            rank_in_section=er.rank_in_section,
            rank_in_branch=er.rank_in_branch,
        )
        for er, s, u in result.all()
    ]


# ---------------------------------------------------------------------------
# Student: my exam schedule + seat
# ---------------------------------------------------------------------------


@router.get("/students/me/exam-schedule", response_model=list[dict[str, Any]])
async def student_exam_schedule(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    # Get published exams and their schedules
    schedules = await db.execute(
        select(ExamSchedule, Exam, Subject)
        .join(Exam, ExamSchedule.exam_id == Exam.id)
        .join(Subject, ExamSchedule.subject_id == Subject.id)
        .where(Exam.is_published.is_(True))
        .order_by(ExamSchedule.exam_date, ExamSchedule.start_time)
    )

    items = []
    for sched, exam, subj in schedules.all():
        # Check if student has a seat assignment
        seat_result = await db.execute(
            select(SeatingArrangement, Room)
            .join(Room, SeatingArrangement.room_id == Room.id)
            .where(
                SeatingArrangement.exam_schedule_id == sched.id,
                SeatingArrangement.student_id == user.id,
            )
        )
        seat_row = seat_result.first()

        item: dict[str, Any] = {
            "exam_name": exam.name,
            "subject_code": subj.code,
            "subject_name": subj.name,
            "date": str(sched.exam_date),
            "start_time": sched.start_time,
            "end_time": sched.end_time,
        }
        if seat_row:
            seat, room = seat_row
            item["room"] = f"{room.building} {room.name}"
            item["seat_number"] = seat.seat_number
            item["bench_number"] = seat.bench_number
        items.append(item)

    return items


# ---------------------------------------------------------------------------
# Student: my results
# ---------------------------------------------------------------------------


@router.get("/students/me/results", response_model=list[dict[str, Any]])
async def student_results(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    results = await db.execute(
        select(ExamResult, Exam, Subject)
        .join(Exam, ExamResult.exam_id == Exam.id)
        .join(Subject, ExamResult.subject_id == Subject.id)
        .where(ExamResult.student_id == user.id, Exam.is_published.is_(True))
        .order_by(Exam.name, Subject.code)
    )

    return [
        {
            "exam_name": exam.name,
            "exam_type": exam.exam_type,
            "max_marks": exam.max_marks,
            "subject_code": subj.code,
            "subject_name": subj.name,
            "marks_obtained": er.marks_obtained,
            "is_absent": er.is_absent,
            "rank_in_section": er.rank_in_section,
            "rank_in_branch": er.rank_in_branch,
        }
        for er, exam, subj in results.all()
    ]


# ---------------------------------------------------------------------------
# Admin: Generate seating
# ---------------------------------------------------------------------------


@router.post("/admin/seating/generate")
async def gen_seating(body: GenerateSeatingRequest, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    count = await generate_seating(db, body.exam_schedule_id, body.room_ids, body.is_exam)
    return {"seated": count}


@router.get("/admin/seating/{exam_schedule_id}", response_model=list[SeatRead])
async def get_seating(
    exam_schedule_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(
        select(SeatingArrangement, Student, User, Room)
        .join(Student, SeatingArrangement.student_id == Student.user_id)
        .join(User, Student.user_id == User.id)
        .join(Room, SeatingArrangement.room_id == Room.id)
        .where(SeatingArrangement.exam_schedule_id == exam_schedule_id)
        .order_by(Room.name, SeatingArrangement.seat_number)
    )
    return [
        SeatRead(
            student_id=sa.student_id,
            student_name=u.full_name,
            roll_number=s.roll_number,
            room_name=r.name,
            building=r.building,
            seat_number=sa.seat_number,
            bench_number=sa.bench_number,
        )
        for sa, s, u, r in result.all()
    ]
