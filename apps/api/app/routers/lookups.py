"""Lightweight lookup endpoints for dropdown selectors."""

import datetime
import uuid
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.core.db import DbSession
from app.models.academic import AcademicYear, Semester, Subject
from app.models.activity import Activity
from app.models.batch import Batch, Division
from app.models.branch import Branch
from app.models.department import Department
from app.models.user import Faculty, Student, User

router = APIRouter(prefix="/lookups", tags=["lookups"])

YEAR_LABELS = {1: "FY", 2: "SY", 3: "TY", 4: "Final Year"}


def _current_year_of_study(admission_year: int) -> int:
    today = datetime.date.today()
    academic_year_start = today.year if today.month >= 6 else today.year - 1
    return max(1, min(4, academic_year_start - admission_year + 1))


class LookupItem(BaseModel):
    id: str
    label: str
    extra: str | None = None


@router.get("/departments", response_model=list[LookupItem])
async def lookup_departments(db: DbSession) -> Any:
    result = await db.execute(select(Department).order_by(Department.code))
    return [LookupItem(id=str(d.id), label=f"{d.code} — {d.name}") for d in result.scalars().all()]


@router.get("/branches", response_model=list[LookupItem])
async def lookup_branches(db: DbSession) -> Any:
    result = await db.execute(select(Branch).order_by(Branch.code))
    return [LookupItem(id=str(b.id), label=f"{b.code} — {b.name}") for b in result.scalars().all()]


@router.get("/academic-years", response_model=list[LookupItem])
async def lookup_academic_years(db: DbSession) -> Any:
    result = await db.execute(select(AcademicYear).order_by(AcademicYear.label.desc()))
    return [
        LookupItem(id=str(ay.id), label=f"{ay.label}{' (Current)' if ay.is_current else ''}")
        for ay in result.scalars().all()
    ]


@router.get("/semesters", response_model=list[LookupItem])
async def lookup_semesters(db: DbSession) -> Any:
    result = await db.execute(
        select(Semester, AcademicYear)
        .join(AcademicYear, Semester.academic_year_id == AcademicYear.id)
        .order_by(AcademicYear.label.desc(), Semester.number)
    )
    return [
        LookupItem(
            id=str(sem.id),
            label=f"{ay.label} Sem {sem.number}{' (Current)' if sem.is_current else ''}",
        )
        for sem, ay in result.all()
    ]


@router.get("/divisions", response_model=list[LookupItem])
async def lookup_divisions(
    db: DbSession,
    batch_id: uuid.UUID | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
) -> Any:
    query = (
        select(Division, Batch, Department)
        .join(Batch, Division.batch_id == Batch.id)
        .join(Department, Division.department_id == Department.id)
    )
    if batch_id:
        query = query.where(Division.batch_id == batch_id)
    if department_id:
        query = query.where(Division.department_id == department_id)
    query = query.order_by(Batch.admission_year.desc(), Department.code, Division.name)

    result = await db.execute(query)
    items = []
    for div, batch, dept in result.all():
        yr = _current_year_of_study(batch.admission_year)
        yr_label = YEAR_LABELS.get(yr, f"Year {yr}")
        items.append(
            LookupItem(
                id=str(div.id),
                label=f"{dept.code} {yr_label}-{div.name} ({batch.admission_year + 4} batch)",
                extra=str(batch.admission_year),
            )
        )
    return items


@router.get("/sections", response_model=list[LookupItem])
async def lookup_sections(
    db: DbSession,
    semester_id: uuid.UUID | None = Query(None),
    branch_id: uuid.UUID | None = Query(None),
) -> Any:
    # Return divisions as sections for backward compat
    return await lookup_divisions(db)


@router.get("/subjects", response_model=list[LookupItem])
async def lookup_subjects(db: DbSession, department_id: uuid.UUID | None = Query(None)) -> Any:
    query = select(Subject).order_by(Subject.code)
    if department_id:
        query = query.where(Subject.department_id == department_id)
    result = await db.execute(query)
    return [
        LookupItem(id=str(s.id), label=f"{s.code} — {s.name}", extra=s.kind)
        for s in result.scalars().all()
    ]


@router.get("/activities", response_model=list[LookupItem])
async def lookup_activities(db: DbSession) -> Any:
    result = await db.execute(
        select(Activity).where(Activity.is_active.is_(True)).order_by(Activity.name)
    )
    return [LookupItem(id=str(a.id), label=a.name, extra=a.kind) for a in result.scalars().all()]


@router.get("/faculty", response_model=list[LookupItem])
async def lookup_faculty(db: DbSession, department_id: uuid.UUID | None = Query(None)) -> Any:
    query = select(Faculty, User).join(User, Faculty.user_id == User.id)
    if department_id:
        query = query.where(Faculty.department_id == department_id)
    query = query.order_by(User.full_name)
    result = await db.execute(query)
    return [
        LookupItem(id=str(f.user_id), label=f"{u.full_name} ({f.employee_id})", extra=f.designation)
        for f, u in result.all()
    ]


@router.get("/students", response_model=list[LookupItem])
async def lookup_students(
    db: DbSession,
    q: str = Query("", min_length=0),
    branch_id: uuid.UUID | None = Query(None),
    batch: int | None = Query(None),
) -> Any:
    query = select(Student, User).join(User, Student.user_id == User.id)
    if branch_id:
        query = query.where(Student.branch_id == branch_id)
    if batch:
        query = query.where(Student.admission_year == batch - 4)
    if q:
        query = query.where(User.full_name.ilike(f"%{q}%") | Student.roll_number.ilike(f"%{q}%"))
    query = query.order_by(Student.roll_number).limit(50)
    result = await db.execute(query)
    return [
        LookupItem(
            id=str(s.user_id),
            label=f"{s.roll_number} — {u.full_name}",
            extra=f"Batch {s.admission_year + 4}",
        )
        for s, u in result.all()
    ]


@router.get("/batches", response_model=list[LookupItem])
async def lookup_batches(db: DbSession) -> Any:
    result = await db.execute(select(Batch).order_by(Batch.admission_year.desc()))
    items = []
    for batch in result.scalars().all():
        yr = _current_year_of_study(batch.admission_year)
        yr_label = YEAR_LABELS.get(yr, f"Year {yr}")
        items.append(
            LookupItem(
                id=str(batch.id),
                label=f"{batch.admission_year + 4} Batch — {yr_label}",
                extra=str(batch.admission_year),
            )
        )
    return items
