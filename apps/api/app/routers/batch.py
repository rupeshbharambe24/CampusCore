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
from app.models.batch import Batch, Division
from app.models.branch import Branch
from app.models.department import Department
from app.models.user import Student

router = APIRouter(prefix="/batches", tags=["batches"])

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HOD}
YEAR_LABELS = {1: "FY", 2: "SY", 3: "TY", 4: "Final Year"}
BATCH_PREFIXES = {1: "F", 2: "S", 3: "T", 4: "B"}


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
    year_label: str
    label: str
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


class CreateBatchRequest(BaseModel):
    admission_year: int = Field(ge=2020, le=2035)


class CreateDivisionsRequest(BaseModel):
    batch_id: uuid.UUID
    department_id: uuid.UUID
    division_names: list[str] = Field(default_factory=lambda: ["A", "B"])
    lab_batch_count: int = 3


# ---------------------------------------------------------------------------
# List all batches
# ---------------------------------------------------------------------------


@router.get("", response_model=list[BatchRead])
async def list_batches(user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(select(Batch).order_by(Batch.admission_year.desc()))
    batches = list(result.scalars().all())

    items = []
    for b in batches:
        yr = _current_year_of_study(b.admission_year)
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
            # Count students by admission year + branch
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
                stu_count = stu_q.scalar_one()

            divs.append(
                DivisionRead(
                    id=div.id,
                    batch_id=b.id,
                    department_id=dept.id,
                    department_code=dept.code,
                    name=div.name,
                    display_name=f"{dept.code} {yr_label}-{div.name}",
                    lab_batch_count=div.lab_batch_count,
                    student_count=stu_count // max(1, len([d for d, _ in div_result.all()]) or 1),
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
                year_label=yr_label,
                label=f"{b.admission_year + 4} Batch — {yr_label}",
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

    batch = Batch(admission_year=body.admission_year)
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    yr = _current_year_of_study(batch.admission_year)
    return {
        "id": str(batch.id),
        "admission_year": batch.admission_year,
        "graduation_year": batch.admission_year + 4,
        "current_year": yr,
        "label": f"{batch.admission_year + 4} Batch — {YEAR_LABELS.get(yr, f'Year {yr}')}",
    }


# ---------------------------------------------------------------------------
# Create divisions for a batch + department (bulk)
# ---------------------------------------------------------------------------


@router.post("/divisions", status_code=201, response_model=list[DivisionRead])
async def create_divisions(body: CreateDivisionsRequest, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    # Verify batch exists
    batch_result = await db.execute(select(Batch).where(Batch.id == body.batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    dept_result = await db.execute(select(Department).where(Department.id == body.department_id))
    dept = dept_result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")

    yr = _current_year_of_study(batch.admission_year)
    yr_label = YEAR_LABELS.get(yr, f"Year {yr}")
    created = []

    for div_name in body.division_names:
        # Check if already exists
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
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(Division).where(Division.id == division_id))
    div = result.scalar_one_or_none()
    if not div:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(div)
    await db.commit()
