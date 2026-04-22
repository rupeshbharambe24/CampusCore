"""Lightweight lookup endpoints for dropdown selectors.

No auth required for lookups — they return minimal data (id + display label).
Used by frontend dropdowns instead of raw UUID text inputs.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.core.db import DbSession
from app.models.academic import AcademicYear, Section, Semester, Subject
from app.models.activity import Activity
from app.models.branch import Branch
from app.models.department import Department
from app.models.user import Faculty, Student, User

router = APIRouter(prefix="/lookups", tags=["lookups"])


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
        LookupItem(
            id=str(ay.id),
            label=f"{ay.label}{' (Current)' if ay.is_current else ''}",
        )
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


@router.get("/sections", response_model=list[LookupItem])
async def lookup_sections(
    db: DbSession,
    semester_id: uuid.UUID | None = Query(None),
    branch_id: uuid.UUID | None = Query(None),
) -> Any:
    query = select(Section, Branch).join(Branch, Section.branch_id == Branch.id)
    if semester_id:
        query = query.where(Section.semester_id == semester_id)
    if branch_id:
        query = query.where(Section.branch_id == branch_id)
    query = query.order_by(Branch.code, Section.year_of_study, Section.name)

    result = await db.execute(query)
    year_labels = {1: "FY", 2: "SY", 3: "TY", 4: "Final"}
    return [
        LookupItem(
            id=str(sec.id),
            label=f"{br.code} {year_labels.get(sec.year_of_study, f'Y{sec.year_of_study}')}-{sec.name}",
            extra=f"Year {sec.year_of_study}",
        )
        for sec, br in result.all()
    ]


@router.get("/subjects", response_model=list[LookupItem])
async def lookup_subjects(
    db: DbSession,
    department_id: uuid.UUID | None = Query(None),
) -> Any:
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
async def lookup_faculty(
    db: DbSession,
    department_id: uuid.UUID | None = Query(None),
) -> Any:
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
        # batch = graduation year, admission_year = batch - 4
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
    """List distinct batches (graduation years) from student admission years."""
    from sqlalchemy import distinct

    result = await db.execute(
        select(distinct(Student.admission_year)).order_by(Student.admission_year.desc())
    )
    year_labels = {1: "FY", 2: "SY", 3: "TY", 4: "Final"}
    import datetime

    current_year = datetime.date.today().year
    items = []
    for (adm_year,) in result.all():
        grad_year = adm_year + 4
        current_study_year = current_year - adm_year + 1
        if current_study_year < 1 or current_study_year > 4:
            yr_label = "Graduated" if current_study_year > 4 else "Not started"
        else:
            yr_label = year_labels.get(current_study_year, f"Year {current_study_year}")
        items.append(
            LookupItem(
                id=str(grad_year),
                label=f"{grad_year} Batch — Currently {yr_label}",
                extra=str(adm_year),
            )
        )
    return items
