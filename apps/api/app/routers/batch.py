"""Batch management — admin creates batches, divisions, assigns students."""

import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.academic import Section, Semester
from app.models.batch import Batch, Division
from app.models.branch import Branch
from app.models.department import Department
from app.models.user import Student

router = APIRouter(prefix="/batches", tags=["batches"])

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN}
YEAR_LABELS = {1: "FY", 2: "SY", 3: "TY", 4: "Final Year"}


def _current_year_of_study(admission_year: int) -> int:
    today = date.today()
    academic_year_start = today.year if today.month >= 6 else today.year - 1
    return max(1, min(4, academic_year_start - admission_year + 1))


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class BatchRead(BaseModel):
    id: uuid.UUID
    admission_year: int
    graduation_year: int
    current_year: int
    current_semester: int
    year_label: str
    label: str
    is_graduated: bool
    divisions: list["DivisionRead"]
    student_count: int


class DivisionRead(BaseModel):
    id: uuid.UUID
    batch_id: uuid.UUID
    department_id: uuid.UUID
    department_code: str
    name: str
    display_name: str
    lab_batch_count: int
    student_count: int
    section_id: uuid.UUID | None = None  # linked section for timetable/attendance


class CreateBatchRequest(BaseModel):
    admission_year: int = Field(ge=2020, le=2035)


class CreateDivisionsRequest(BaseModel):
    batch_id: uuid.UUID
    department_id: uuid.UUID
    division_names: list[str] = Field(default_factory=lambda: ["A", "B"])
    lab_batch_count: int = 3


# ---------------------------------------------------------------------------
# Helper: auto-create section from division
# ---------------------------------------------------------------------------


async def _create_section_for_division(
    db: Any,
    batch: Batch,
    dept: Department,
    div: Division,
) -> Any:
    """Auto-create a section row matching this division for timetable/attendance compatibility."""
    # Get the branch for this department
    branch_result = await db.execute(select(Branch).where(Branch.department_id == dept.id))
    branch = branch_result.scalar_one_or_none()
    if not branch:
        return None

    # Get current semester
    sem_result = await db.execute(select(Semester).where(Semester.is_current.is_(True)))
    semester = sem_result.scalar_one_or_none()
    if not semester:
        return None

    yr = batch.current_year_of_study

    # Check if section already exists
    existing = await db.execute(
        select(Section).where(
            Section.semester_id == semester.id,
            Section.branch_id == branch.id,
            Section.year_of_study == yr,
            Section.name == div.name,
        )
    )
    section = existing.scalar_one_or_none()
    if section:
        return section.id

    section = Section(
        semester_id=semester.id,
        branch_id=branch.id,
        year_of_study=yr,
        name=div.name,
        lab_batch_count=div.lab_batch_count,
    )
    db.add(section)
    await db.flush()
    return section.id


# ---------------------------------------------------------------------------
# List all batches
# ---------------------------------------------------------------------------


@router.get("", response_model=list[BatchRead])
async def list_batches(user: CurrentUser, db: DbSession) -> Any:
    if user.role not in {*ADMIN_ROLES, UserRole.HOD}:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(select(Batch).order_by(Batch.admission_year.desc()))
    batches = list(result.scalars().all())

    items = []
    for b in batches:
        yr = b.current_year_of_study
        yr_label = YEAR_LABELS.get(yr, f"Year {yr}")

        # Get divisions
        div_result = await db.execute(
            select(Division, Department)
            .join(Department, Division.department_id == Department.id)
            .where(Division.batch_id == b.id)
            .order_by(Department.code, Division.name)
        )
        divs = []
        for div, dept in div_result.all():
            # Count students for this division by matching admission_year + branch
            branch_result = await db.execute(
                select(Branch.id).where(Branch.department_id == dept.id)
            )
            branch_ids = list(branch_result.scalars().all())
            stu_count = 0
            if branch_ids:
                stu_q = await db.execute(
                    select(func.count())
                    .select_from(Student)
                    .where(
                        Student.admission_year == b.admission_year,
                        Student.branch_id.in_(branch_ids),
                    )
                )
                total_in_dept = stu_q.scalar_one()
                # Divide by number of divisions for this dept in this batch
                div_count_result = await db.execute(
                    select(func.count())
                    .select_from(Division)
                    .where(
                        Division.batch_id == b.id,
                        Division.department_id == dept.id,
                    )
                )
                div_count = div_count_result.scalar_one()
                stu_count = total_in_dept // max(1, div_count)

            # Find linked section
            section_id = None
            if branch_ids:
                sem_result = await db.execute(select(Semester).where(Semester.is_current.is_(True)))
                sem = sem_result.scalar_one_or_none()
                if sem:
                    sec_result = await db.execute(
                        select(Section.id).where(
                            Section.semester_id == sem.id,
                            Section.branch_id.in_(branch_ids),
                            Section.year_of_study == yr,
                            Section.name == div.name,
                        )
                    )
                    sec = sec_result.scalar_one_or_none()
                    if sec:
                        section_id = sec

            divs.append(
                DivisionRead(
                    id=div.id,
                    batch_id=b.id,
                    department_id=dept.id,
                    department_code=dept.code,
                    name=div.name,
                    display_name=f"{dept.code} {yr_label}-{div.name}",
                    lab_batch_count=div.lab_batch_count,
                    student_count=stu_count,
                    section_id=section_id,
                )
            )

        total_students = await db.execute(
            select(func.count())
            .select_from(Student)
            .where(Student.admission_year == b.admission_year)
        )

        items.append(
            BatchRead(
                id=b.id,
                admission_year=b.admission_year,
                graduation_year=b.admission_year + 4,
                current_year=yr,
                current_semester=b.current_semester_num,
                year_label=yr_label,
                label=b.label,
                is_graduated=b.is_graduated,
                divisions=divs,
                student_count=total_students.scalar_one(),
            )
        )

    return items


# ---------------------------------------------------------------------------
# Create batch
# ---------------------------------------------------------------------------


@router.post("", status_code=201, response_model=dict[str, Any])
async def create_batch(body: CreateBatchRequest, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    existing = await db.execute(select(Batch).where(Batch.admission_year == body.admission_year))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Batch for admission year {body.admission_year} already exists",
        )

    today = date.today()
    academic_year_start = today.year if today.month >= 6 else today.year - 1
    years_elapsed = academic_year_start - body.admission_year
    if years_elapsed < 0:
        initial_sem = 1
    else:
        initial_sem = min(8, years_elapsed * 2 + (1 if today.month >= 6 else 2))

    batch = Batch(admission_year=body.admission_year, current_semester_num=initial_sem)
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    yr = batch.current_year_of_study
    return {
        "id": str(batch.id),
        "admission_year": batch.admission_year,
        "graduation_year": batch.admission_year + 4,
        "current_year": yr,
        "current_semester": batch.current_semester_num,
        "label": batch.label,
    }


# ---------------------------------------------------------------------------
# Create divisions for a batch + department (bulk)
# ---------------------------------------------------------------------------


@router.post("/divisions", status_code=201, response_model=list[DivisionRead])
async def create_divisions(body: CreateDivisionsRequest, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in {*ADMIN_ROLES, UserRole.HOD}:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    batch_result = await db.execute(select(Batch).where(Batch.id == body.batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    dept_result = await db.execute(select(Department).where(Department.id == body.department_id))
    dept = dept_result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")

    yr = batch.current_year_of_study
    yr_label = YEAR_LABELS.get(yr, f"Year {yr}")
    created = []

    for div_name in body.division_names:
        existing = await db.execute(
            select(Division).where(
                Division.batch_id == body.batch_id,
                Division.department_id == body.department_id,
                Division.name == div_name,
            )
        )
        if existing.scalar_one_or_none():
            continue

        div = Division(
            batch_id=body.batch_id,
            department_id=body.department_id,
            name=div_name,
            lab_batch_count=body.lab_batch_count,
        )
        db.add(div)
        await db.flush()

        # Auto-create matching section for timetable/attendance
        section_id = await _create_section_for_division(db, batch, dept, div)

        created.append(
            DivisionRead(
                id=div.id,
                batch_id=body.batch_id,
                department_id=dept.id,
                department_code=dept.code,
                name=div_name,
                display_name=f"{dept.code} {yr_label}-{div_name}",
                lab_batch_count=body.lab_batch_count,
                student_count=0,
                section_id=section_id,
            )
        )

    await db.commit()
    return created


# ---------------------------------------------------------------------------
# Delete batch
# ---------------------------------------------------------------------------


@router.delete("/{batch_id}", status_code=204)
async def delete_batch(batch_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(Batch).where(Batch.id == batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    # Check if students exist
    stu_count = await db.execute(
        select(func.count())
        .select_from(Student)
        .where(Student.admission_year == batch.admission_year)
    )
    if stu_count.scalar_one() > 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Cannot delete: students belong to this batch"
        )
    # Delete divisions first
    divs = await db.execute(select(Division).where(Division.batch_id == batch_id))
    for d in divs.scalars().all():
        await db.delete(d)
    await db.delete(batch)
    await db.commit()


# ---------------------------------------------------------------------------
# Delete division
# ---------------------------------------------------------------------------


@router.delete("/divisions/{division_id}", status_code=204)
async def delete_division(division_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    if user.role not in {*ADMIN_ROLES, UserRole.HOD}:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(Division).where(Division.id == division_id))
    div = result.scalar_one_or_none()
    if not div:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(div)
    await db.commit()
