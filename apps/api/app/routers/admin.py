"""Admin CRUD endpoints for all academic entities.

All routes require an authenticated admin/super_admin/hod user.
Paginated list, create, get-by-id, update, delete for each entity.
"""

import math
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import (
    AcademicYear,
    Activity,
    Branch,
    Department,
    FacultySubjectAssignment,
    Room,
    Section,
    SectionSubject,
    Semester,
    Subject,
    TimetableSlot,
    UserRole,
)
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearRead,
    ActivityCreate,
    ActivityRead,
    BranchCreate,
    BranchRead,
    DepartmentCreate,
    DepartmentRead,
    FacultyAssignmentCreate,
    FacultyAssignmentRead,
    RoomCreate,
    RoomRead,
    SectionCreate,
    SectionRead,
    SectionSubjectCreate,
    SectionSubjectRead,
    SemesterCreate,
    SemesterRead,
    SubjectCreate,
    SubjectRead,
    TimetableSlotCreate,
    TimetableSlotRead,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HOD}


def _require_admin(user: Any) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------


async def _list_entities(
    db: AsyncSession,
    model: type,
    schema: type[BaseModel],
    page: int,
    size: int,
) -> PaginatedResponse:  # type: ignore[type-arg]
    total_result = await db.execute(select(func.count()).select_from(model))
    total = total_result.scalar_one()
    pages = max(1, math.ceil(total / size))

    rows: Any = await db.execute(select(model).offset((page - 1) * size).limit(size))
    items = [schema.model_validate(row) for row in rows.scalars().all()]

    return PaginatedResponse(items=items, total=total, page=page, size=size, pages=pages)


async def _create_entity(
    db: AsyncSession,
    model: type,
    schema: type[BaseModel],
    data: BaseModel,
) -> BaseModel:
    obj = model(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return schema.model_validate(obj)


async def _get_entity(
    db: AsyncSession,
    model: Any,
    schema: type[BaseModel],
    entity_id: uuid.UUID,
) -> BaseModel:
    result = await db.execute(select(model).where(model.id == entity_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return schema.model_validate(obj)


async def _delete_entity(
    db: AsyncSession,
    model: Any,
    entity_id: uuid.UUID,
) -> None:
    result = await db.execute(select(model).where(model.id == entity_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await db.delete(obj)
    await db.commit()


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------


@router.get("/departments", response_model=PaginatedResponse[DepartmentRead])
async def list_departments(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, Department, DepartmentRead, page, size)


@router.post("/departments", status_code=201, response_model=DepartmentRead)
async def create_department(body: DepartmentCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    # Create department
    dept = Department(**body.model_dump())
    db.add(dept)
    await db.flush()
    # Auto-create a matching branch (dept = branch in this college)
    from app.models import Branch as BranchModel

    existing_branch = await db.execute(select(BranchModel).where(BranchModel.code == body.code))
    if not existing_branch.scalar_one_or_none():
        db.add(BranchModel(department_id=dept.id, code=body.code, name=body.name, duration_years=4))
    await db.commit()
    await db.refresh(dept)
    return DepartmentRead.model_validate(dept)


@router.get("/departments/{id}", response_model=DepartmentRead)
async def get_department(id: uuid.UUID, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _get_entity(db, Department, DepartmentRead, id)


@router.delete("/departments/{id}", status_code=204)
async def delete_department(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    from app.models import Branch as BranchModel
    from app.models.user import Student

    # Check if any students belong to branches in this department
    branch_result = await db.execute(select(BranchModel).where(BranchModel.department_id == id))
    branches = list(branch_result.scalars().all())
    branch_ids = [b.id for b in branches]

    if branch_ids:
        student_count_result = await db.execute(
            select(func.count()).select_from(Student).where(Student.branch_id.in_(branch_ids))
        )
        student_count = student_count_result.scalar_one()
        if student_count > 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Cannot delete: {student_count} students belong to this department. Remove students first.",
            )

    # Delete branches first, then department
    for branch in branches:
        await db.delete(branch)
    await db.flush()
    await _delete_entity(db, Department, id)


# ---------------------------------------------------------------------------
# Branches
# ---------------------------------------------------------------------------


@router.get("/branches", response_model=PaginatedResponse[BranchRead])
async def list_branches(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, Branch, BranchRead, page, size)


@router.post("/branches", status_code=201, response_model=BranchRead)
async def create_branch(body: BranchCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _create_entity(db, Branch, BranchRead, body)


@router.delete("/branches/{id}", status_code=204)
async def delete_branch(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, Branch, id)


# ---------------------------------------------------------------------------
# Academic Years
# ---------------------------------------------------------------------------


@router.get("/academic-years", response_model=PaginatedResponse[AcademicYearRead])
async def list_academic_years(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, AcademicYear, AcademicYearRead, page, size)


@router.post("/academic-years", status_code=201, response_model=AcademicYearRead)
async def create_academic_year(body: AcademicYearCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _create_entity(db, AcademicYear, AcademicYearRead, body)


@router.delete("/academic-years/{id}", status_code=204)
async def delete_academic_year(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, AcademicYear, id)


# ---------------------------------------------------------------------------
# Semesters
# ---------------------------------------------------------------------------


@router.get("/semesters", response_model=PaginatedResponse[SemesterRead])
async def list_semesters(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, Semester, SemesterRead, page, size)


@router.post("/semesters", status_code=201, response_model=SemesterRead)
async def create_semester(body: SemesterCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _create_entity(db, Semester, SemesterRead, body)


@router.delete("/semesters/{id}", status_code=204)
async def delete_semester(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, Semester, id)


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------


@router.get("/sections", response_model=PaginatedResponse[SectionRead])
async def list_sections(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, Section, SectionRead, page, size)


@router.post("/sections", status_code=201, response_model=SectionRead)
async def create_section(body: SectionCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _create_entity(db, Section, SectionRead, body)


@router.delete("/sections/{id}", status_code=204)
async def delete_section(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, Section, id)


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------


@router.get("/subjects", response_model=PaginatedResponse[SubjectRead])
async def list_subjects(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, Subject, SubjectRead, page, size)


@router.post("/subjects", status_code=201, response_model=SubjectRead)
async def create_subject(body: SubjectCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _create_entity(db, Subject, SubjectRead, body)


@router.delete("/subjects/{id}", status_code=204)
async def delete_subject(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, Subject, id)


# ---------------------------------------------------------------------------
# Section-Subjects
# ---------------------------------------------------------------------------


@router.get("/section-subjects", response_model=PaginatedResponse[SectionSubjectRead])
async def list_section_subjects(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, SectionSubject, SectionSubjectRead, page, size)


@router.post("/section-subjects", status_code=201, response_model=SectionSubjectRead)
async def create_section_subject(
    body: SectionSubjectCreate,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    _require_admin(user)
    return await _create_entity(db, SectionSubject, SectionSubjectRead, body)


@router.delete("/section-subjects/{id}", status_code=204)
async def delete_section_subject(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, SectionSubject, id)


# ---------------------------------------------------------------------------
# Faculty Assignments
# ---------------------------------------------------------------------------


@router.get("/faculty-assignments", response_model=PaginatedResponse[FacultyAssignmentRead])
async def list_faculty_assignments(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(
        db,
        FacultySubjectAssignment,
        FacultyAssignmentRead,
        page,
        size,
    )


@router.post("/faculty-assignments", status_code=201, response_model=FacultyAssignmentRead)
async def create_faculty_assignment(
    body: FacultyAssignmentCreate,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    _require_admin(user)
    return await _create_entity(
        db,
        FacultySubjectAssignment,
        FacultyAssignmentRead,
        body,
    )


@router.delete("/faculty-assignments/{id}", status_code=204)
async def delete_faculty_assignment(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, FacultySubjectAssignment, id)


# ---------------------------------------------------------------------------
# Rooms
# ---------------------------------------------------------------------------


@router.get("/rooms", response_model=PaginatedResponse[RoomRead])
async def list_rooms(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, Room, RoomRead, page, size)


@router.post("/rooms", status_code=201, response_model=RoomRead)
async def create_room(body: RoomCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _create_entity(db, Room, RoomRead, body)


@router.delete("/rooms/{id}", status_code=204)
async def delete_room(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, Room, id)


# ---------------------------------------------------------------------------
# Timetable Slots
# ---------------------------------------------------------------------------


@router.get("/timetable-slots", response_model=PaginatedResponse[TimetableSlotRead])
async def list_timetable_slots(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, TimetableSlot, TimetableSlotRead, page, size)


@router.post("/timetable-slots", status_code=201, response_model=TimetableSlotRead)
async def create_timetable_slot(
    body: TimetableSlotCreate,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    _require_admin(user)
    return await _create_entity(db, TimetableSlot, TimetableSlotRead, body)


@router.delete("/timetable-slots/{id}", status_code=204)
async def delete_timetable_slot(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, TimetableSlot, id)


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------


@router.get("/activities", response_model=PaginatedResponse[ActivityRead])
async def list_activities(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
) -> Any:
    _require_admin(user)
    return await _list_entities(db, Activity, ActivityRead, page, size)


@router.post("/activities", status_code=201, response_model=ActivityRead)
async def create_activity(body: ActivityCreate, user: CurrentUser, db: DbSession) -> Any:
    _require_admin(user)
    return await _create_entity(db, Activity, ActivityRead, body)


@router.delete("/activities/{id}", status_code=204)
async def delete_activity(id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    _require_admin(user)
    await _delete_entity(db, Activity, id)
