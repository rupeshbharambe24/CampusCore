"""Study materials endpoints: faculty uploads, students view."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import StudyMaterial, UserRole
from app.models.academic import SectionSubject
from app.models.user import Student

router = APIRouter(tags=["materials"])


class MaterialCreate(BaseModel):
    subject_id: uuid.UUID
    title: str = Field(max_length=256)
    description: str | None = None
    material_type: str = "notes"
    url: str = Field(max_length=1024)
    topic: str | None = None
    order_index: int = 0


class MaterialRead(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    uploaded_by: uuid.UUID | None
    title: str
    description: str | None
    material_type: str
    url: str
    topic: str | None
    order_index: int
    created_at: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Faculty: upload + manage materials
# ---------------------------------------------------------------------------


@router.post("/faculty/materials", status_code=201, response_model=MaterialRead)
async def upload_material(body: MaterialCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    mat = StudyMaterial(**body.model_dump(), uploaded_by=user.id)
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return MaterialRead.model_validate(mat)


@router.get("/faculty/materials", response_model=list[MaterialRead])
async def faculty_materials(
    user: CurrentUser,
    db: DbSession,
    subject_id: uuid.UUID | None = Query(None),
) -> Any:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    query = select(StudyMaterial).where(StudyMaterial.uploaded_by == user.id)
    if subject_id:
        query = query.where(StudyMaterial.subject_id == subject_id)
    query = query.order_by(StudyMaterial.order_index, StudyMaterial.created_at.desc())

    result = await db.execute(query)
    return [MaterialRead.model_validate(m) for m in result.scalars().all()]


@router.delete("/faculty/materials/{material_id}", status_code=204)
async def delete_material(material_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(
        select(StudyMaterial).where(
            StudyMaterial.id == material_id, StudyMaterial.uploaded_by == user.id
        )
    )
    mat = result.scalar_one_or_none()
    if not mat:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(mat)
    await db.commit()


# ---------------------------------------------------------------------------
# Student: view materials for their subjects
# ---------------------------------------------------------------------------


@router.get("/students/me/materials", response_model=list[MaterialRead])
async def student_materials(
    user: CurrentUser,
    db: DbSession,
    subject_id: uuid.UUID | None = Query(None),
) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    # Get student's section subjects
    student_result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = student_result.scalar_one_or_none()
    if not student or not student.current_section_id:
        return []

    if subject_id:
        # Specific subject
        query = (
            select(StudyMaterial)
            .where(StudyMaterial.subject_id == subject_id)
            .order_by(StudyMaterial.order_index, StudyMaterial.created_at.desc())
        )
    else:
        # All subjects for their section
        subj_ids_result = await db.execute(
            select(SectionSubject.subject_id).where(
                SectionSubject.section_id == student.current_section_id
            )
        )
        subj_ids = list(subj_ids_result.scalars().all())
        if not subj_ids:
            return []
        query = (
            select(StudyMaterial)
            .where(StudyMaterial.subject_id.in_(subj_ids))
            .order_by(StudyMaterial.order_index, StudyMaterial.created_at.desc())
        )

    result = await db.execute(query)
    return [MaterialRead.model_validate(m) for m in result.scalars().all()]
