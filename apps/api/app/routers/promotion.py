"""Batch promotion endpoints: semester promotion + year-end promotion."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.batch import Batch
from app.models.notification import Notification
from app.models.user import Student

router = APIRouter(prefix="/promotion", tags=["promotion"])

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN}
YEAR_LABELS = {1: "FY", 2: "SY", 3: "TY", 4: "Final Year"}


class PromotionPreview(BaseModel):
    batch_id: str
    batch_label: str
    current_semester: int
    next_semester: int
    current_year: int
    next_year: int
    student_count: int
    detained_count: int
    action: str  # "next_semester" or "next_year" or "graduate"


class PromotionResult(BaseModel):
    success: bool
    message: str
    students_promoted: int
    students_detained: int
    students_graduated: int


# ---------------------------------------------------------------------------
# Preview what will happen
# ---------------------------------------------------------------------------


@router.get("/preview/{batch_id}", response_model=PromotionPreview)
async def preview_promotion(batch_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    batch_result = await db.execute(select(Batch).where(Batch.id == batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    if batch.is_graduated:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Batch already graduated")

    student_count_result = await db.execute(
        select(func.count())
        .select_from(Student)
        .where(Student.admission_year == batch.admission_year, Student.is_graduated.is_(False))
    )
    student_count = student_count_result.scalar_one()

    detained_result = await db.execute(
        select(func.count())
        .select_from(Student)
        .where(Student.admission_year == batch.admission_year, Student.is_detained.is_(True))
    )
    detained_count = detained_result.scalar_one()

    current_sem = batch.current_semester_num
    current_year = batch.current_year_of_study

    # Determine action
    if current_sem >= 8:
        action = "graduate"
        next_sem = 8
        next_year = 4
    elif current_sem % 2 == 1:
        # Odd sem → next is even sem (same year)
        action = "next_semester"
        next_sem = current_sem + 1
        next_year = current_year
    else:
        # Even sem → next is odd sem of next year
        action = "next_year"
        next_sem = current_sem + 1
        next_year = current_year + 1

    return PromotionPreview(
        batch_id=str(batch.id),
        batch_label=batch.label,
        current_semester=current_sem,
        next_semester=next_sem,
        current_year=current_year,
        next_year=next_year,
        student_count=student_count,
        detained_count=detained_count,
        action=action,
    )


# ---------------------------------------------------------------------------
# Execute promotion
# ---------------------------------------------------------------------------


class DetainRequest(BaseModel):
    detained_student_ids: list[uuid.UUID] = []


@router.post("/execute/{batch_id}", response_model=PromotionResult)
async def execute_promotion(
    batch_id: uuid.UUID,
    body: DetainRequest,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    batch_result = await db.execute(select(Batch).where(Batch.id == batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    if batch.is_graduated:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Batch already graduated")

    current_sem = batch.current_semester_num
    promoted = 0
    detained = 0
    graduated = 0

    # Mark detained students
    for student_id in body.detained_student_ids:
        stu_result = await db.execute(select(Student).where(Student.user_id == student_id))
        stu = stu_result.scalar_one_or_none()
        if stu:
            stu.is_detained = True
            detained += 1
            # Notify detained student
            db.add(
                Notification(
                    user_id=student_id,
                    type="promotion.detained",
                    title="Year Detained",
                    body="You have been detained in the current year. Please contact your HOD.",
                    link="/student/profile",
                )
            )

    # Determine action
    if current_sem >= 8:
        # Graduate the batch
        batch.is_graduated = True

        # Mark non-detained students as graduated
        students_result = await db.execute(
            select(Student).where(
                Student.admission_year == batch.admission_year,
                Student.is_detained.is_(False),
                Student.is_graduated.is_(False),
            )
        )
        for stu in students_result.scalars().all():
            stu.is_graduated = True
            graduated += 1
            db.add(
                Notification(
                    user_id=stu.user_id,
                    type="promotion.graduated",
                    title="Congratulations! You have graduated!",
                    body=f"Your batch ({batch.graduation_year}) has been marked as graduated.",
                    link="/student/profile",
                )
            )

        message = f"Batch {batch.graduation_year} graduated. {graduated} students graduated, {detained} detained."

    else:
        # Advance semester
        batch.current_semester_num = current_sem + 1
        new_year = batch.current_year_of_study
        yr_label = YEAR_LABELS.get(new_year, f"Year {new_year}")

        # Count promoted (non-detained)
        promoted_result = await db.execute(
            select(func.count())
            .select_from(Student)
            .where(
                Student.admission_year == batch.admission_year,
                Student.is_detained.is_(False),
                Student.is_graduated.is_(False),
            )
        )
        promoted = promoted_result.scalar_one()

        # Notify promoted students
        students_result = await db.execute(
            select(Student).where(
                Student.admission_year == batch.admission_year,
                Student.is_detained.is_(False),
                Student.is_graduated.is_(False),
            )
        )
        for stu in students_result.scalars().all():
            db.add(
                Notification(
                    user_id=stu.user_id,
                    type="promotion.promoted",
                    title=f"Promoted to Semester {batch.current_semester_num}",
                    body=f"You are now in {yr_label}, Semester {batch.current_semester_num}.",
                    link="/student/profile",
                )
            )

        sem_type = "Odd" if batch.is_odd_semester else "Even"
        message = f"Batch promoted to Sem {batch.current_semester_num} ({yr_label}, {sem_type}). {promoted} promoted, {detained} detained."

    await db.commit()

    return PromotionResult(
        success=True,
        message=message,
        students_promoted=promoted,
        students_detained=detained,
        students_graduated=graduated,
    )


# ---------------------------------------------------------------------------
# Undo detention (admin can un-detain a student)
# ---------------------------------------------------------------------------


@router.post("/undetain/{student_id}")
async def undetain_student(student_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(Student).where(Student.user_id == student_id))
    stu = result.scalar_one_or_none()
    if not stu:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    stu.is_detained = False
    await db.commit()
    return {"message": "Student un-detained"}
