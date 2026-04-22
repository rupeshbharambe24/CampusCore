"""Admin report endpoints with optional CSV export."""

import csv
import io
import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import UserRole
from app.models.user import User
from app.services.reports import (
    activity_summary_report,
    below_threshold_report,
    faculty_compliance_report,
    section_attendance_report,
)

router = APIRouter(prefix="/admin/reports", tags=["reports"])

ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HOD}


def _require_admin(user: User) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")


def _csv_response(rows: list[dict[str, Any]], filename: str) -> StreamingResponse:
    """Convert list-of-dicts to a CSV streaming response."""
    if not rows:
        return StreamingResponse(
            iter(["No data\n"]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _wants_csv(request: Request) -> bool:
    accept = request.headers.get("accept", "")
    return "text/csv" in accept


# ---------------------------------------------------------------------------
# Section attendance
# ---------------------------------------------------------------------------


@router.get("/attendance/by-section")
async def report_section_attendance(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    section_id: uuid.UUID = Query(...),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
) -> Any:
    _require_admin(user)
    rows = await section_attendance_report(db, section_id, start_date, end_date)

    if _wants_csv(request):
        return _csv_response(rows, "section_attendance.csv")
    return rows


# ---------------------------------------------------------------------------
# Below threshold
# ---------------------------------------------------------------------------


@router.get("/attendance/below-threshold")
async def report_below_threshold(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    section_id: uuid.UUID | None = Query(None),
    threshold: float = Query(75.0, ge=0, le=100),
) -> Any:
    _require_admin(user)
    rows = await below_threshold_report(db, section_id, threshold)

    if _wants_csv(request):
        return _csv_response(rows, "below_threshold.csv")
    return rows


# ---------------------------------------------------------------------------
# Faculty compliance
# ---------------------------------------------------------------------------


@router.get("/faculty-compliance")
async def report_faculty_compliance(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    semester_id: uuid.UUID = Query(...),
) -> Any:
    _require_admin(user)
    rows = await faculty_compliance_report(db, semester_id)

    if _wants_csv(request):
        return _csv_response(rows, "faculty_compliance.csv")
    return rows


# ---------------------------------------------------------------------------
# Activity summary
# ---------------------------------------------------------------------------


@router.get("/activity-summary")
async def report_activity_summary(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> Any:
    _require_admin(user)
    rows = await activity_summary_report(db)

    if _wants_csv(request):
        return _csv_response(rows, "activity_summary.csv")
    return rows
