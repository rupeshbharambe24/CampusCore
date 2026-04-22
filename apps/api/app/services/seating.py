"""Exam seating arrangement engine.

Rules:
- Exam mode: 1 student per bench (exam_capacity)
- Class test mode: 2 students per bench but from different branches/years
- Students are shuffled and distributed across rooms
- Each student gets a room + seat number
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Room, Section
from app.models.exam import ExamSchedule, SeatingArrangement
from app.models.user import Student


async def generate_seating(
    db: AsyncSession,
    exam_schedule_id: uuid.UUID,
    room_ids: list[uuid.UUID],
    is_exam: bool = True,
) -> int:
    """Generate seating arrangement for an exam schedule.

    Args:
        exam_schedule_id: the specific exam+subject schedule
        room_ids: rooms to use for this exam
        is_exam: True=1 per bench (exam), False=2 per bench with cross-mixing (class test)

    Returns:
        Number of students seated.
    """
    # Get the exam schedule to know which sections are involved
    sched_result = await db.execute(select(ExamSchedule).where(ExamSchedule.id == exam_schedule_id))
    schedule = sched_result.scalar_one()

    # Get students for the scheduled sections (or all if sections is null)
    student_query = select(Student).order_by(Student.roll_number)
    if schedule.sections:
        section_names = [s.strip() for s in schedule.sections.split(",")]
        section_result = await db.execute(select(Section.id).where(Section.name.in_(section_names)))
        section_ids = list(section_result.scalars().all())
        if section_ids:
            student_query = student_query.where(Student.current_section_id.in_(section_ids))

    students_result = await db.execute(student_query)
    students = list(students_result.scalars().all())

    # Shuffle for randomness (cross-branch mixing)
    import random

    random.shuffle(students)

    # For class tests: interleave students from different branches
    if not is_exam and len(students) > 1:
        students = _interleave_by_branch(students)

    # Get rooms with capacity
    rooms_result = await db.execute(select(Room).where(Room.id.in_(room_ids)).order_by(Room.name))
    rooms = list(rooms_result.scalars().all())

    # Clear existing arrangements for this schedule
    existing = await db.execute(
        select(SeatingArrangement).where(SeatingArrangement.exam_schedule_id == exam_schedule_id)
    )
    for old in existing.scalars().all():
        await db.delete(old)

    # Assign seats
    seated = 0
    student_idx = 0

    for room in rooms:
        capacity = (room.exam_capacity or room.capacity or 40) if is_exam else (room.capacity or 80)

        for seat in range(1, capacity + 1):
            if student_idx >= len(students):
                break

            student = students[student_idx]
            bench = (seat + 1) // 2

            arrangement = SeatingArrangement(
                exam_schedule_id=exam_schedule_id,
                student_id=student.user_id,
                room_id=room.id,
                seat_number=seat,
                bench_number=bench,
            )
            db.add(arrangement)
            student_idx += 1
            seated += 1

        if student_idx >= len(students):
            break

    await db.commit()
    return seated


def _interleave_by_branch(students: list[Any]) -> list[Any]:
    """Interleave students so adjacent seats have different branches."""
    by_branch: dict[uuid.UUID, list[Any]] = {}
    for s in students:
        by_branch.setdefault(s.branch_id, []).append(s)

    result = []
    branch_lists = list(by_branch.values())
    max_len = max(len(lst) for lst in branch_lists)

    for i in range(max_len):
        for lst in branch_lists:
            if i < len(lst):
                result.append(lst[i])

    return result
