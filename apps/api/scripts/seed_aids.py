"""Seed script: AI & Data Science branch with realistic test data.

Run: cd apps/api && uv run python scripts/seed_aids.py
"""

import asyncio
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.academic import (
    AcademicYear,
    FacultySubjectAssignment,
    Room,
    Section,
    SectionSubject,
    Semester,
    Subject,
    TimetableSlot,
)
from app.models.activity import Activity
from app.models.branch import Branch
from app.models.department import Department
from app.models.enums import UserRole
from app.models.user import Faculty, Student, User


async def seed() -> None:
    settings = get_settings()
    engine = create_async_engine(str(settings.database_url))
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        print("Seeding AI & Data Science branch...")

        # ---- Super Admin ----
        admin = await _get_or_create_user(
            db,
            email="admin@campuscore.in",
            full_name="Super Admin",
            role=UserRole.SUPER_ADMIN,
            password="admin1234",
        )
        print(f"  Admin: admin@campuscore.in / admin1234 (id: {admin.id})")

        # ---- Department ----
        dept = await _get_or_create(
            db, Department, code="AIDS", name="Artificial Intelligence & Data Science"
        )
        print(f"  Department: {dept.code} (id: {dept.id})")

        # ---- Branch ----
        branch = await _get_or_create(
            db,
            Branch,
            code="AIDS",
            name="AI & Data Science",
            department_id=dept.id,
            duration_years=4,
        )
        print(f"  Branch: {branch.code} (id: {branch.id})")

        # ---- Academic Year + Semester ----
        ay = await _get_or_create(
            db,
            AcademicYear,
            label="2025-26",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_current=True,
        )
        sem = await _get_or_create(
            db,
            Semester,
            academic_year_id=ay.id,
            number=2,
            start_date=date(2026, 1, 15),
            end_date=date(2026, 5, 15),
            is_current=True,
        )
        print(f"  Academic Year: {ay.label}, Semester: {sem.number}")

        # ---- Sections ----
        sec_a = await _get_or_create(
            db,
            Section,
            semester_id=sem.id,
            branch_id=branch.id,
            year_of_study=2,
            name="A",
            lab_batch_count=3,
        )
        sec_b = await _get_or_create(
            db,
            Section,
            semester_id=sem.id,
            branch_id=branch.id,
            year_of_study=2,
            name="B",
            lab_batch_count=3,
        )
        print(f"  Sections: A (id: {sec_a.id}), B (id: {sec_b.id})")

        # ---- HOD: Dr. Sriniwas Zanwar ----
        hod_user = await _get_or_create_user(
            db,
            email="sriniwas.zanwar@campuscore.in",
            full_name="Dr. Sriniwas Zanwar",
            role=UserRole.HOD,
            password="hod1234",
        )
        await _get_or_create(
            db,
            Faculty,
            user_id=hod_user.id,
            employee_id="AIDS-HOD-001",
            department_id=dept.id,
            designation="Professor & HOD",
            is_hod=True,
        )
        print("  HOD: Dr. Sriniwas Zanwar - sriniwas.zanwar@campuscore.in / hod1234")

        # ---- Faculty ----
        faculty_data = [
            ("Dr. Priya Mehta", "priya.mehta@campuscore.in", "AIDS-F002", "Associate Professor"),
            (
                "Prof. Amit Kulkarni",
                "amit.kulkarni@campuscore.in",
                "AIDS-F003",
                "Assistant Professor",
            ),
            ("Dr. Sneha Patil", "sneha.patil@campuscore.in", "AIDS-F004", "Associate Professor"),
            (
                "Prof. Rajesh Deshmukh",
                "rajesh.deshmukh@campuscore.in",
                "AIDS-F005",
                "Assistant Professor",
            ),
            (
                "Dr. Kavita Sharma",
                "kavita.sharma@campuscore.in",
                "AIDS-F006",
                "Assistant Professor",
            ),
        ]

        faculty_ids = [hod_user.id]
        for name, email, emp_id, designation in faculty_data:
            fu = await _get_or_create_user(
                db, email=email, full_name=name, role=UserRole.FACULTY, password="faculty1234"
            )
            await _get_or_create(
                db,
                Faculty,
                user_id=fu.id,
                employee_id=emp_id,
                department_id=dept.id,
                designation=designation,
                is_hod=False,
            )
            faculty_ids.append(fu.id)
            print(f"  Faculty: {name} - {email} / faculty1234")

        # ---- Subjects ----
        subjects_data = [
            ("AI301", "Machine Learning", 4, "lecture"),
            ("AI302", "Deep Learning", 3, "lecture"),
            ("AI303", "Natural Language Processing", 3, "lecture"),
            ("DS304", "Big Data Analytics", 3, "lecture"),
            ("MA305", "Probability & Statistics", 4, "lecture"),
            ("AI391", "ML Lab", 2, "lab"),
            ("AI392", "DL Lab", 2, "lab"),
            ("APT301", "Aptitude & Soft Skills", 2, "aptitude"),
        ]

        subject_objs = []
        for code, name, credits, kind in subjects_data:
            s = await _get_or_create(
                db, Subject, code=code, name=name, credits=credits, kind=kind, department_id=dept.id
            )
            subject_objs.append(s)
            print(f"  Subject: {code} - {name}")

        # ---- Section-Subject links ----
        for sec in [sec_a, sec_b]:
            for subj in subject_objs:
                await _get_or_create(db, SectionSubject, section_id=sec.id, subject_id=subj.id)

        # ---- Faculty-Subject Assignments ----
        # HOD teaches ML, Priya teaches DL, Amit teaches NLP, Sneha teaches BDA, Rajesh teaches Stats, Kavita teaches labs
        assignments = [
            (faculty_ids[0], subject_objs[0]),  # HOD → ML
            (faculty_ids[1], subject_objs[1]),  # Priya → DL
            (faculty_ids[2], subject_objs[2]),  # Amit → NLP
            (faculty_ids[3], subject_objs[3]),  # Sneha → BDA
            (faculty_ids[4], subject_objs[4]),  # Rajesh → Stats
            (faculty_ids[5], subject_objs[5]),  # Kavita → ML Lab
            (faculty_ids[5], subject_objs[6]),  # Kavita → DL Lab
            (faculty_ids[2], subject_objs[7]),  # Amit → Aptitude
        ]

        for fac_id, subj in assignments:
            for sec in [sec_a, sec_b]:
                ss_result = await db.execute(
                    select(SectionSubject).where(
                        SectionSubject.section_id == sec.id,
                        SectionSubject.subject_id == subj.id,
                    )
                )
                ss = ss_result.scalar_one_or_none()
                if ss:
                    await _get_or_create(
                        db, FacultySubjectAssignment, faculty_id=fac_id, section_subject_id=ss.id
                    )

        # ---- Rooms ----
        rooms_data = [
            ("AI Block", "LT-101", 120),
            ("AI Block", "LT-102", 80),
            ("AI Block", "AI Lab-201", 60),
            ("AI Block", "AI Lab-202", 60),
            ("Main", "LT-5", 200),
        ]
        room_objs = []
        for building, name, cap in rooms_data:
            r = await _get_or_create(db, Room, building=building, name=name, capacity=cap)
            room_objs.append(r)

        # ---- Timetable Slots ----
        slot_times = [
            ("09:00", "09:50", "P1"),
            ("10:00", "10:50", "P2"),
            ("11:00", "11:50", "P3"),
            ("12:00", "12:50", "P4"),
            ("14:00", "14:50", "P5"),
            ("15:00", "15:50", "P6"),
        ]
        for day in range(6):  # Mon-Sat
            for start, end, label in slot_times:
                await _get_or_create(
                    db,
                    TimetableSlot,
                    day_of_week=day,
                    start_time=start,
                    end_time=end,
                    slot_label=label,
                )

        # ---- Students (20 per section) ----
        student_names = [
            "Aarav Patel",
            "Aditi Sharma",
            "Arjun Deshmukh",
            "Bhavya Joshi",
            "Diya Kulkarni",
            "Gaurav Patil",
            "Ishaan Reddy",
            "Kavya Mehta",
            "Manav Singh",
            "Nisha Verma",
            "Pranav Gupta",
            "Riya Thakur",
            "Saurabh Yadav",
            "Tanvi Kadam",
            "Uday Bhosale",
            "Vaishali Mane",
            "Waris Khan",
            "Yash Jadhav",
            "Zara Sheikh",
            "Aditya Gaikwad",
            "Ananya Pawar",
            "Chirag Dalvi",
            "Divya Kale",
            "Eshan Deshpande",
            "Fatima Shaikh",
            "Ganesh Salunkhe",
            "Harsha Naik",
            "Isha Wagh",
            "Jayesh More",
            "Kirti Sawant",
            "Lakshmi Iyer",
            "Mohit Sonawane",
            "Neha Chavan",
            "Om Thorat",
            "Pallavi Shinde",
            "Rahul Jagtap",
            "Sakshi Gavhane",
            "Tushar Nikam",
            "Uma Pardeshi",
            "Vikas Suryawanshi",
        ]

        batches = ["B1", "B2", "B3"]
        for i, (sec, sec_label) in enumerate([(sec_a, "A"), (sec_b, "B")]):
            for j in range(20):
                idx = i * 20 + j
                name = student_names[idx % len(student_names)]
                roll = f"24AIDS{sec_label}{j + 1:03d}"
                email = f"{roll.lower()}@campuscore.in"
                batch = batches[j % 3]

                su = await _get_or_create_user(
                    db, email=email, full_name=name, role=UserRole.STUDENT, password="student1234"
                )
                await _get_or_create(
                    db,
                    Student,
                    user_id=su.id,
                    roll_number=roll,
                    branch_id=branch.id,
                    admission_year=2024,
                    current_section_id=sec.id,
                    lab_batch=batch,
                )

        print("  Students: 40 seeded (20 per section)")

        # ---- Activities ----
        activities_data = [
            ("AI Club", "club", hod_user.id),
            ("Hackathon Team", "team", faculty_ids[2]),
            ("NSS Unit", "nss", faculty_ids[4]),
        ]
        for name, kind, coord_id in activities_data:
            await _get_or_create(
                db, Activity, name=name, kind=kind, coordinator_id=coord_id, is_active=True
            )
            print(f"  Activity: {name}")

        await db.commit()
        print("\nSeed complete! Login credentials:")
        print("  Admin:   admin@campuscore.in / admin1234")
        print("  HOD:     sriniwas.zanwar@campuscore.in / hod1234")
        print("  Faculty: priya.mehta@campuscore.in / faculty1234")
        print("           amit.kulkarni@campuscore.in / faculty1234")
        print("           sneha.patil@campuscore.in / faculty1234")
        print("           rajesh.deshmukh@campuscore.in / faculty1234")
        print("           kavita.sharma@campuscore.in / faculty1234")
        print("  Students: 24aidsa001@campuscore.in / student1234 (through 24aidsb020)")

    await engine.dispose()


async def _get_or_create_user(
    db: AsyncSession, email: str, full_name: str, role: UserRole, password: str
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    user = User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=hash_password(password),
        is_active=True,
        must_change_password=False,
    )
    db.add(user)
    await db.flush()
    return user


async def _get_or_create(db: AsyncSession, model: type, **kwargs):  # type: ignore[no-untyped-def]
    """Get existing row by all kwargs, or create new one."""
    query = select(model)
    for k, v in kwargs.items():
        query = query.where(getattr(model, k) == v)
    result = await db.execute(query)
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    obj = model(**kwargs)
    db.add(obj)
    await db.flush()
    return obj


if __name__ == "__main__":
    asyncio.run(seed())
