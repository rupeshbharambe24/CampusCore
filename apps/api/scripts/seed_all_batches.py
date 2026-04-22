"""Seed all 4 batches of AI&DS students (FY through Final Year)."""

import asyncio
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.academic import AcademicYear, Section, Semester
from app.models.branch import Branch
from app.models.enums import UserRole
from app.models.user import Student, User


STUDENT_NAMES = [
    "Aarav Patel", "Aditi Sharma", "Arjun Deshmukh", "Bhavya Joshi",
    "Diya Kulkarni", "Gaurav Patil", "Ishaan Reddy", "Kavya Mehta",
    "Manav Singh", "Nisha Verma", "Pranav Gupta", "Riya Thakur",
    "Saurabh Yadav", "Tanvi Kadam", "Uday Bhosale", "Vaishali Mane",
    "Waris Khan", "Yash Jadhav", "Zara Sheikh", "Aditya Gaikwad",
    "Ananya Pawar", "Chirag Dalvi", "Divya Kale", "Eshan Deshpande",
    "Fatima Shaikh", "Ganesh Salunkhe", "Harsha Naik", "Isha Wagh",
    "Jayesh More", "Kirti Sawant", "Lakshmi Iyer", "Mohit Sonawane",
    "Neha Chavan", "Om Thorat", "Pallavi Shinde", "Rahul Jagtap",
    "Sakshi Gavhane", "Tushar Nikam", "Uma Pardeshi", "Vikas Suryawanshi",
]

# Batch config: (admission_year, year_of_study, batch_prefix, roll_prefix_digit)
BATCHES = [
    (2022, 4, "B", 4),   # Final Year (2026 batch) - B.Tech batch
    (2023, 3, "T", 3),   # TY (2027 batch)
    # (2024, 2, "S", 2), # SY (2028 batch) — already seeded
    (2025, 1, "F", 1),   # FY (2029 batch)
]

LAB_BATCHES = {
    1: ["F1", "F2", "F3"],
    2: ["S1", "S2", "S3"],
    3: ["T1", "T2", "T3"],
    4: ["B1", "B2", "B3"],  # B.Tech batch uses B1/B2/B3
}


async def seed() -> None:
    settings = get_settings()
    engine = create_async_engine(str(settings.database_url))
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        # Get AIDS branch
        branch_result = await db.execute(select(Branch).where(Branch.code == "AIDS"))
        branch = branch_result.scalar_one_or_none()
        if not branch:
            print("ERROR: AIDS branch not found. Run seed_aids.py first.")
            return

        # Get current semester
        sem_result = await db.execute(select(Semester).where(Semester.is_current.is_(True)))
        semester = sem_result.scalar_one_or_none()
        if not semester:
            print("ERROR: No current semester found.")
            return

        for adm_year, year_of_study, batch_prefix, roll_digit in BATCHES:
            grad_year = adm_year + 4
            print(f"\n--- {grad_year} Batch (Admission {adm_year}, Currently Year {year_of_study}) ---")

            # Create sections A and B for this year
            for sec_name in ["A", "B"]:
                # Check if section exists
                sec_result = await db.execute(
                    select(Section).where(
                        Section.semester_id == semester.id,
                        Section.branch_id == branch.id,
                        Section.year_of_study == year_of_study,
                        Section.name == sec_name,
                    )
                )
                section = sec_result.scalar_one_or_none()
                if not section:
                    section = Section(
                        semester_id=semester.id,
                        branch_id=branch.id,
                        year_of_study=year_of_study,
                        name=sec_name,
                        lab_batch_count=3,
                    )
                    db.add(section)
                    await db.flush()
                    print(f"  Created section: AIDS Year-{year_of_study} {sec_name}")

                # Create 20 students per section
                batches = LAB_BATCHES[year_of_study]
                for j in range(20):
                    serial = j + 1 + (0 if sec_name == "A" else 20)
                    roll = f"AI{roll_digit}{serial:03d}"
                    email = f"{roll.lower()}@campuscore.in"
                    name = STUDENT_NAMES[(j + (0 if sec_name == "A" else 20)) % len(STUDENT_NAMES)]
                    lab_batch = batches[j % 3]

                    # Check if already exists
                    existing = await db.execute(select(User).where(User.email == email))
                    if existing.scalar_one_or_none():
                        continue

                    user = User(
                        email=email,
                        full_name=name,
                        role=UserRole.STUDENT,
                        password_hash=hash_password("student1234"),
                        is_active=True,
                        must_change_password=False,
                    )
                    db.add(user)
                    await db.flush()

                    student = Student(
                        user_id=user.id,
                        roll_number=roll,
                        branch_id=branch.id,
                        admission_year=adm_year,
                        current_section_id=section.id,
                        lab_batch=lab_batch,
                    )
                    db.add(student)

                print(f"  Seeded 20 students for AIDS Year-{year_of_study} {sec_name}")

            print(f"  Lab batches: {', '.join(LAB_BATCHES[year_of_study])}")

        await db.commit()
        print("\n\nAll batches seeded! Summary:")
        print("  2026 Batch (Final/4th year) — AI4001-AI4040 / student1234")
        print("  2027 Batch (TY/3rd year)    — AI3001-AI3040 / student1234")
        print("  2028 Batch (SY/2nd year)    — already existed (AI2xxx)")
        print("  2029 Batch (FY/1st year)    — AI1001-AI1040 / student1234")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
