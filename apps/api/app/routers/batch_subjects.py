"""Batch subject & faculty assignment endpoints.

Step 1: Assign subjects to a batch (which subjects does this batch study this semester)
Step 2: Assign faculty to subjects per division (who teaches what)
"""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.academic import FacultySubjectAssignment, Section, SectionSubject, Semester, Subject
from app.models.batch import Batch, Division
from app.models.branch import Branch
from app.models.user import Faculty, User

router = APIRouter(tags=["batch-subjects"])

MANAGE_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HOD}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SubjectAssignment(BaseModel):
    subject_id: uuid.UUID
    subject_code: str
    subject_name: str
    kind: str
    is_assigned: bool


class AssignSubjectsRequest(BaseModel):
    batch_id: uuid.UUID
    department_id: uuid.UUID
    subject_ids: list[uuid.UUID]


class FacultyAssignment(BaseModel):
    subject_id: uuid.UUID
    subject_code: str
    subject_name: str
    kind: str
    faculty_id: uuid.UUID | None
    faculty_name: str | None
    lab_batch: str | None
    assignment_id: uuid.UUID | None


class SetFacultyRequest(BaseModel):
    division_id: uuid.UUID
    subject_id: uuid.UUID
    faculty_id: uuid.UUID
    lab_batch: str | None = None


# ---------------------------------------------------------------------------
# Step 1: List available subjects for a batch+department
# ---------------------------------------------------------------------------


@router.get("/batches/{batch_id}/subjects/{department_id}", response_model=list[SubjectAssignment])
async def list_batch_subjects(
    batch_id: uuid.UUID,
    department_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    if user.role not in MANAGE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    # Get all subjects for this department
    all_subjects = await db.execute(
        select(Subject).where(Subject.department_id == department_id).order_by(Subject.code)
    )

    # Get which ones are already assigned (via section_subjects for any division in this batch)
    batch_result = await db.execute(select(Batch).where(Batch.id == batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    # Find sections linked to divisions of this batch+department
    assigned_subject_ids: set[uuid.UUID] = set()
    divisions = await db.execute(
        select(Division).where(
            Division.batch_id == batch_id, Division.department_id == department_id
        )
    )
    for div in divisions.scalars().all():
        branch_result = await db.execute(
            select(Branch).where(Branch.department_id == department_id)
        )
        branch = branch_result.scalar_one_or_none()
        if not branch:
            continue
        sem_result = await db.execute(select(Semester).where(Semester.is_current.is_(True)))
        sem = sem_result.scalar_one_or_none()
        if not sem:
            continue
        sec_result = await db.execute(
            select(Section).where(
                Section.semester_id == sem.id,
                Section.branch_id == branch.id,
                Section.year_of_study == batch.current_year_of_study,
                Section.name == div.name,
            )
        )
        section = sec_result.scalar_one_or_none()
        if section:
            ss_result = await db.execute(
                select(SectionSubject.subject_id).where(SectionSubject.section_id == section.id)
            )
            for sid in ss_result.scalars().all():
                assigned_subject_ids.add(sid)

    items = []
    for subj in all_subjects.scalars().all():
        items.append(
            SubjectAssignment(
                subject_id=subj.id,
                subject_code=subj.code,
                subject_name=subj.name,
                kind=subj.kind,
                is_assigned=subj.id in assigned_subject_ids,
            )
        )
    return items


# ---------------------------------------------------------------------------
# Step 1: Assign subjects to a batch+department (bulk)
# ---------------------------------------------------------------------------


@router.post("/batches/assign-subjects", status_code=200)
async def assign_subjects(body: AssignSubjectsRequest, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in MANAGE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    batch_result = await db.execute(select(Batch).where(Batch.id == body.batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    branch_result = await db.execute(
        select(Branch).where(Branch.department_id == body.department_id)
    )
    branch = branch_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No branch for this department")

    sem_result = await db.execute(select(Semester).where(Semester.is_current.is_(True)))
    semester = sem_result.scalar_one_or_none()
    if not semester:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No current semester found")

    yr = batch.current_year_of_study

    # Get all divisions for this batch+department
    divisions = await db.execute(
        select(Division).where(
            Division.batch_id == body.batch_id, Division.department_id == body.department_id
        )
    )

    assigned = 0
    for div in divisions.scalars().all():
        # Find or create matching section
        sec_result = await db.execute(
            select(Section).where(
                Section.semester_id == semester.id,
                Section.branch_id == branch.id,
                Section.year_of_study == yr,
                Section.name == div.name,
            )
        )
        section = sec_result.scalar_one_or_none()
        if not section:
            section = Section(
                semester_id=semester.id,
                branch_id=branch.id,
                year_of_study=yr,
                name=div.name,
                lab_batch_count=div.lab_batch_count,
            )
            db.add(section)
            await db.flush()

        # Clear existing assignments for this section
        existing = await db.execute(
            select(SectionSubject).where(SectionSubject.section_id == section.id)
        )
        for old in existing.scalars().all():
            await db.delete(old)

        # Add new assignments
        for subj_id in body.subject_ids:
            db.add(SectionSubject(section_id=section.id, subject_id=subj_id))
            assigned += 1

    await db.commit()
    return {
        "message": f"Assigned {len(body.subject_ids)} subjects to {assigned // max(1, len(body.subject_ids))} divisions"
    }


# ---------------------------------------------------------------------------
# Step 2: List faculty assignments for a division
# ---------------------------------------------------------------------------


@router.get("/divisions/{division_id}/faculty-assignments", response_model=list[FacultyAssignment])
async def list_faculty_assignments(division_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in MANAGE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    div_result = await db.execute(select(Division).where(Division.id == division_id))
    div = div_result.scalar_one_or_none()
    if not div:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    batch_result = await db.execute(select(Batch).where(Batch.id == div.batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    branch_result = await db.execute(
        select(Branch).where(Branch.department_id == div.department_id)
    )
    branch = branch_result.scalar_one_or_none()
    if not branch:
        return []

    sem_result = await db.execute(select(Semester).where(Semester.is_current.is_(True)))
    sem = sem_result.scalar_one_or_none()
    if not sem:
        return []

    sec_result = await db.execute(
        select(Section).where(
            Section.semester_id == sem.id,
            Section.branch_id == branch.id,
            Section.year_of_study == batch.current_year_of_study,
            Section.name == div.name,
        )
    )
    section = sec_result.scalar_one_or_none()
    if not section:
        return []

    # Get assigned subjects
    ss_result = await db.execute(
        select(SectionSubject, Subject)
        .join(Subject, SectionSubject.subject_id == Subject.id)
        .where(SectionSubject.section_id == section.id)
        .order_by(Subject.code)
    )

    items = []
    for ss, subj in ss_result.all():
        # Check if faculty assigned
        fa_result = await db.execute(
            select(FacultySubjectAssignment, Faculty, User)
            .join(Faculty, FacultySubjectAssignment.faculty_id == Faculty.user_id)
            .join(User, Faculty.user_id == User.id)
            .where(FacultySubjectAssignment.section_subject_id == ss.id)
        )
        fa_rows = fa_result.all()

        if fa_rows:
            for fa, fac, u in fa_rows:
                items.append(
                    FacultyAssignment(
                        subject_id=subj.id,
                        subject_code=subj.code,
                        subject_name=subj.name,
                        kind=subj.kind,
                        faculty_id=fac.user_id,
                        faculty_name=u.full_name,
                        lab_batch=fa.lab_batch,
                        assignment_id=fa.id,
                    )
                )
        else:
            items.append(
                FacultyAssignment(
                    subject_id=subj.id,
                    subject_code=subj.code,
                    subject_name=subj.name,
                    kind=subj.kind,
                    faculty_id=None,
                    faculty_name=None,
                    lab_batch=None,
                    assignment_id=None,
                )
            )

    return items


# ---------------------------------------------------------------------------
# Step 2: Set faculty for a subject in a division
# ---------------------------------------------------------------------------


@router.post("/divisions/set-faculty", status_code=200)
async def set_faculty_assignment(body: SetFacultyRequest, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in MANAGE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    div_result = await db.execute(select(Division).where(Division.id == body.division_id))
    div = div_result.scalar_one_or_none()
    if not div:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Division not found")

    batch_result = await db.execute(select(Batch).where(Batch.id == div.batch_id))
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    branch_result = await db.execute(
        select(Branch).where(Branch.department_id == div.department_id)
    )
    branch = branch_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No branch for department")

    sem_result = await db.execute(select(Semester).where(Semester.is_current.is_(True)))
    sem = sem_result.scalar_one_or_none()
    if not sem:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No current semester")

    sec_result = await db.execute(
        select(Section).where(
            Section.semester_id == sem.id,
            Section.branch_id == branch.id,
            Section.year_of_study == batch.current_year_of_study,
            Section.name == div.name,
        )
    )
    section = sec_result.scalar_one_or_none()
    if not section:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Section not created yet. Assign subjects first."
        )

    # Find section_subject
    ss_result = await db.execute(
        select(SectionSubject).where(
            SectionSubject.section_id == section.id,
            SectionSubject.subject_id == body.subject_id,
        )
    )
    ss = ss_result.scalar_one_or_none()
    if not ss:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Subject not assigned to this division")

    # Check if assignment already exists
    existing = await db.execute(
        select(FacultySubjectAssignment).where(
            FacultySubjectAssignment.section_subject_id == ss.id,
            FacultySubjectAssignment.lab_batch == body.lab_batch,
        )
    )
    fa = existing.scalar_one_or_none()
    if fa:
        fa.faculty_id = body.faculty_id
    else:
        db.add(
            FacultySubjectAssignment(
                faculty_id=body.faculty_id,
                section_subject_id=ss.id,
                lab_batch=body.lab_batch,
            )
        )

    await db.commit()
    return {"message": "Faculty assigned"}


# ---------------------------------------------------------------------------
# Get subjects+faculty for timetable dropdown (for a specific division)
# ---------------------------------------------------------------------------


@router.get("/divisions/{division_id}/timetable-options")
async def timetable_options(division_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    """Returns subjects with their assigned faculty — used by timetable cell editor."""
    if user.role not in MANAGE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    assignments = await list_faculty_assignments(division_id, user, db)

    # Group by subject, include faculty
    options = []
    seen: set[str] = set()
    for a in assignments:
        key = f"{a.subject_id}-{a.lab_batch or ''}"
        if key in seen:
            continue
        seen.add(key)
        options.append(
            {
                "subject_id": str(a.subject_id),
                "subject_code": a.subject_code,
                "subject_name": a.subject_name,
                "kind": a.kind,
                "faculty_id": str(a.faculty_id) if a.faculty_id else None,
                "faculty_name": a.faculty_name,
                "lab_batch": a.lab_batch,
            }
        )

    return options
