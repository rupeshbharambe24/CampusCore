"""Assignment + submission tracker endpoints."""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import Assignment, Submission, UserRole
from app.models.user import Student, User

router = APIRouter(tags=["submissions"])


class AssignmentCreate(BaseModel):
    subject_id: uuid.UUID
    title: str = Field(max_length=256)
    description: str | None = None
    assignment_type: str = "assignment"
    due_date: str | None = None
    max_marks: int | None = None
    section_ids: str | None = None


class AssignmentRead(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    created_by: uuid.UUID | None
    title: str
    description: str | None
    assignment_type: str
    due_date: str | None
    max_marks: int | None
    section_ids: str | None
    created_at: str
    model_config = {"from_attributes": True}


class SubmissionRead(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str | None = None
    roll_number: str | None = None
    status: str
    proof_url: str | None
    submitted_at: str | None
    checked_at: str | None
    marks: float | None
    remarks: str | None
    model_config = {"from_attributes": True}


class SubmitProof(BaseModel):
    proof_url: str = Field(max_length=1024)


class GradeSubmission(BaseModel):
    status: str
    marks: float | None = None
    remarks: str | None = None


# ---------------------------------------------------------------------------
# Faculty: create assignments
# ---------------------------------------------------------------------------


@router.post("/faculty/assignments", status_code=201, response_model=AssignmentRead)
async def create_assignment(body: AssignmentCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    a = Assignment(**body.model_dump(), created_by=user.id)
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return AssignmentRead.model_validate(a)


@router.get("/faculty/assignments", response_model=list[AssignmentRead])
async def faculty_assignments(
    user: CurrentUser,
    db: DbSession,
    subject_id: uuid.UUID | None = Query(None),
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    query = select(Assignment).where(Assignment.created_by == user.id)
    if subject_id:
        query = query.where(Assignment.subject_id == subject_id)
    result = await db.execute(query.order_by(Assignment.created_at.desc()))
    return [AssignmentRead.model_validate(a) for a in result.scalars().all()]


# ---------------------------------------------------------------------------
# Faculty: view + grade submissions
# ---------------------------------------------------------------------------


@router.get("/faculty/assignments/{assignment_id}/submissions", response_model=list[SubmissionRead])
async def list_submissions(assignment_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(
        select(Submission, Student, User)
        .join(Student, Submission.student_id == Student.user_id)
        .join(User, Student.user_id == User.id)
        .where(Submission.assignment_id == assignment_id)
        .order_by(Student.roll_number)
    )
    return [
        SubmissionRead(
            id=sub.id,
            assignment_id=sub.assignment_id,
            student_id=sub.student_id,
            student_name=u.full_name,
            roll_number=s.roll_number,
            status=sub.status,
            proof_url=sub.proof_url,
            submitted_at=str(sub.submitted_at) if sub.submitted_at else None,
            checked_at=str(sub.checked_at) if sub.checked_at else None,
            marks=sub.marks,
            remarks=sub.remarks,
        )
        for sub, s, u in result.all()
    ]


@router.patch("/faculty/submissions/{submission_id}", response_model=SubmissionRead)
async def grade_submission(
    submission_id: uuid.UUID,
    body: GradeSubmission,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    sub.status = body.status
    sub.marks = body.marks
    sub.remarks = body.remarks
    sub.checked_at = datetime.now(UTC)
    sub.checked_by = user.id
    await db.commit()
    await db.refresh(sub)

    return SubmissionRead(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        status=sub.status,
        proof_url=sub.proof_url,
        submitted_at=str(sub.submitted_at) if sub.submitted_at else None,
        checked_at=str(sub.checked_at) if sub.checked_at else None,
        marks=sub.marks,
        remarks=sub.remarks,
    )


# ---------------------------------------------------------------------------
# Student: view assignments + submit proof
# ---------------------------------------------------------------------------


@router.get("/students/me/assignments", response_model=list[dict[str, Any]])
async def student_assignments(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    # Get all assignments (simplified: all published ones)
    assignments_result = await db.execute(select(Assignment).order_by(Assignment.due_date.desc()))
    assignments = list(assignments_result.scalars().all())

    items = []
    for a in assignments:
        # Check if student has a submission
        sub_result = await db.execute(
            select(Submission).where(
                Submission.assignment_id == a.id, Submission.student_id == user.id
            )
        )
        sub = sub_result.scalar_one_or_none()

        items.append(
            {
                "assignment": AssignmentRead.model_validate(a).model_dump(),
                "submission": SubmissionRead(
                    id=sub.id,
                    assignment_id=sub.assignment_id,
                    student_id=sub.student_id,
                    status=sub.status,
                    proof_url=sub.proof_url,
                    submitted_at=str(sub.submitted_at) if sub.submitted_at else None,
                    checked_at=str(sub.checked_at) if sub.checked_at else None,
                    marks=sub.marks,
                    remarks=sub.remarks,
                ).model_dump()
                if sub
                else None,
            }
        )

    return items


@router.post("/students/me/assignments/{assignment_id}/submit", response_model=SubmissionRead)
async def submit_assignment(
    assignment_id: uuid.UUID,
    body: SubmitProof,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    # Check if already submitted
    existing = await db.execute(
        select(Submission).where(
            Submission.assignment_id == assignment_id, Submission.student_id == user.id
        )
    )
    sub = existing.scalar_one_or_none()

    now = datetime.now(UTC)
    if sub:
        sub.proof_url = body.proof_url
        sub.submitted_at = now
        sub.status = "submitted"
    else:
        sub = Submission(
            assignment_id=assignment_id,
            student_id=user.id,
            status="submitted",
            proof_url=body.proof_url,
            submitted_at=now,
        )
        db.add(sub)

    await db.commit()
    await db.refresh(sub)

    return SubmissionRead(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        status=sub.status,
        proof_url=sub.proof_url,
        submitted_at=str(sub.submitted_at) if sub.submitted_at else None,
        checked_at=str(sub.checked_at) if sub.checked_at else None,
        marks=sub.marks,
        remarks=sub.remarks,
    )
