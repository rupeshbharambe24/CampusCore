"""Timetable services: period instance generation + collision detection."""

import uuid
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import TimetableSlot
from app.models.timetable import Holiday, Period, PeriodInstance

# ---------------------------------------------------------------------------
# Period instance generation
# ---------------------------------------------------------------------------

# Python weekday: 0=Mon ... 6=Sun (matches our day_of_week convention)


async def generate_instances(
    db: AsyncSession,
    semester_id: uuid.UUID,
    start: date,
    end: date,
) -> int:
    """Generate PeriodInstance rows for all active periods in [start, end].

    Skips holidays and dates where an instance already exists.
    Returns count of newly created instances.
    """
    # Fetch holidays in the range
    holiday_result = await db.execute(select(Holiday.date).where(Holiday.date.between(start, end)))
    holiday_dates: set[date] = set(holiday_result.scalars().all())

    # Fetch active periods for this semester
    periods_result = await db.execute(
        select(Period, TimetableSlot)
        .join(TimetableSlot, Period.timetable_slot_id == TimetableSlot.id)
        .where(Period.semester_id == semester_id)
    )
    period_slot_pairs = periods_result.all()

    # Fetch existing instances in range to avoid duplicates
    existing_result = await db.execute(
        select(PeriodInstance.period_id, PeriodInstance.date).where(
            PeriodInstance.date.between(start, end)
        )
    )
    existing: set[tuple[uuid.UUID, date]] = {
        (row.period_id, row.date) for row in existing_result.all()
    }

    created = 0
    current = start
    while current <= end:
        if current in holiday_dates:
            current += timedelta(days=1)
            continue

        weekday = current.weekday()  # 0=Mon

        for period, slot in period_slot_pairs:
            # Check day matches
            if slot.day_of_week != weekday:
                continue

            # Check valid_from / valid_to
            if period.valid_from > current:
                continue
            if period.valid_to is not None and period.valid_to < current:
                continue

            # Skip if already exists
            if (period.id, current) in existing:
                continue

            instance = PeriodInstance(
                period_id=period.id,
                date=current,
                status="scheduled",
            )
            db.add(instance)
            existing.add((period.id, current))
            created += 1

        current += timedelta(days=1)

    await db.commit()
    return created


# ---------------------------------------------------------------------------
# Collision detection
# ---------------------------------------------------------------------------


class Collision:
    def __init__(
        self, kind: str, period_id: uuid.UUID, conflicting_period_id: uuid.UUID, detail: str
    ) -> None:
        self.kind = kind
        self.period_id = period_id
        self.conflicting_period_id = conflicting_period_id
        self.detail = detail


async def detect_collisions(
    db: AsyncSession,
    semester_id: uuid.UUID,
    *,
    exclude_period_id: uuid.UUID | None = None,
) -> list[Collision]:
    """Find all faculty and room double-bookings within a semester's timetable.

    Returns a list of Collision objects describing each conflict.
    """
    query = (
        select(Period, TimetableSlot)
        .join(TimetableSlot, Period.timetable_slot_id == TimetableSlot.id)
        .where(
            Period.semester_id == semester_id,
            Period.valid_to.is_(None),  # only currently-active periods
        )
    )
    if exclude_period_id:
        query = query.where(Period.id != exclude_period_id)

    result = await db.execute(query)
    period_slots = result.all()

    collisions: list[Collision] = []

    # Group by (day, start_time) to find overlapping slots
    by_slot: dict[tuple[int, str], list[tuple[Period, TimetableSlot]]] = {}
    for period, slot in period_slots:
        key = (slot.day_of_week, slot.start_time)
        by_slot.setdefault(key, []).append((period, slot))

    for _slot_key, entries in by_slot.items():
        if len(entries) < 2:
            continue

        for i in range(len(entries)):
            for j in range(i + 1, len(entries)):
                p1, s1 = entries[i]
                p2, _s2 = entries[j]

                # Faculty collision
                if p1.faculty_id == p2.faculty_id:
                    collisions.append(
                        Collision(
                            kind="faculty",
                            period_id=p1.id,
                            conflicting_period_id=p2.id,
                            detail=f"Faculty {p1.faculty_id} double-booked on day {s1.day_of_week} at {s1.start_time}",
                        )
                    )

                # Room collision (only if both have rooms assigned)
                if p1.room_id and p2.room_id and p1.room_id == p2.room_id:
                    collisions.append(
                        Collision(
                            kind="room",
                            period_id=p1.id,
                            conflicting_period_id=p2.id,
                            detail=f"Room {p1.room_id} double-booked on day {s1.day_of_week} at {s1.start_time}",
                        )
                    )

    return collisions
