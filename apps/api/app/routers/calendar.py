"""Academic calendar endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.calendar import CalendarEvent
from app.models.timetable import Holiday

router = APIRouter(tags=["calendar"])


class CalendarEventCreate(BaseModel):
    date: str
    end_date: str | None = None
    event_type: str
    title: str = Field(max_length=256)
    description: str | None = None
    visible_to: str = "all"


class CalendarEventRead(BaseModel):
    id: uuid.UUID
    date: str
    end_date: str | None
    event_type: str
    title: str
    description: str | None
    visible_to: str
    model_config = {"from_attributes": True}


ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HOD}


@router.post("/admin/calendar", status_code=201, response_model=CalendarEventRead)
async def create_event(body: CalendarEventCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    event = CalendarEvent(**body.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return CalendarEventRead.model_validate(event)


@router.delete("/admin/calendar/{event_id}", status_code=204)
async def delete_event(event_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.delete(event)
    await db.commit()


@router.get("/calendar", response_model=list[CalendarEventRead])
async def list_events(
    user: CurrentUser,
    db: DbSession,
    month: int | None = Query(None),
    year: int | None = Query(None),
) -> Any:
    query = select(CalendarEvent).order_by(CalendarEvent.date)

    # Filter by role visibility
    if user.role == UserRole.STUDENT:
        query = query.where(CalendarEvent.visible_to.in_(["all", "students"]))
    elif user.role in (UserRole.FACULTY, UserRole.HOD):
        query = query.where(CalendarEvent.visible_to.in_(["all", "faculty"]))

    result = await db.execute(query)
    events = [CalendarEventRead.model_validate(e) for e in result.scalars().all()]

    # Also include holidays from the holidays table
    holidays_result = await db.execute(select(Holiday).order_by(Holiday.date))
    for h in holidays_result.scalars().all():
        events.append(
            CalendarEventRead(
                id=h.id,
                date=str(h.date),
                end_date=None,
                event_type="holiday",
                title=h.reason,
                description=None,
                visible_to="all",
            )
        )

    return sorted(events, key=lambda e: e.date)
