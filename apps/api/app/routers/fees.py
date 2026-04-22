"""Fees management endpoints: structures, records, receipts."""

import uuid
from datetime import date as date_type
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.db import DbSession
from app.core.security import CurrentUser
from app.models import FeeReceipt, FeeRecord, FeeStructure, UserRole

router = APIRouter(tags=["fees"])

FEES_ROLES = {UserRole.FEES_DEPARTMENT, UserRole.ADMIN, UserRole.SUPER_ADMIN}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class FeeStructureCreate(BaseModel):
    academic_year_id: uuid.UUID
    branch_id: uuid.UUID | None = None
    year_of_study: int | None = None
    fee_type: str
    amount: float
    description: str | None = None
    due_date: str | None = None


class FeeStructureRead(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    branch_id: uuid.UUID | None
    year_of_study: int | None
    fee_type: str
    amount: float
    description: str | None
    due_date: str | None
    model_config = {"from_attributes": True}


class FeeRecordCreate(BaseModel):
    student_id: uuid.UUID
    fee_structure_id: uuid.UUID | None = None
    fee_type: str
    description: str
    amount: float
    due_date: str | None = None


class FeeRecordRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    fee_type: str
    description: str
    amount: float
    amount_paid: float
    due_date: str | None
    status: str
    paid_date: str | None
    model_config = {"from_attributes": True}


class ReceiptCreate(BaseModel):
    fee_record_id: uuid.UUID
    receipt_number: str
    amount: float
    payment_date: str
    payment_mode: str
    receipt_url: str | None = None
    remarks: str | None = None


class ReceiptRead(BaseModel):
    id: uuid.UUID
    fee_record_id: uuid.UUID
    receipt_number: str
    amount: float
    payment_date: str
    payment_mode: str
    receipt_url: str | None
    remarks: str | None
    model_config = {"from_attributes": True}


class StudentFeeSummary(BaseModel):
    total_fees: float
    total_paid: float
    total_pending: float
    records: list[FeeRecordRead]
    receipts: list[ReceiptRead]


# ---------------------------------------------------------------------------
# Fee Structures (admin/fees dept)
# ---------------------------------------------------------------------------


@router.post("/fees/structures", status_code=201, response_model=FeeStructureRead)
async def create_fee_structure(body: FeeStructureCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in FEES_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    fs = FeeStructure(**body.model_dump())
    db.add(fs)
    await db.commit()
    await db.refresh(fs)
    return FeeStructureRead.model_validate(fs)


@router.get("/fees/structures", response_model=list[FeeStructureRead])
async def list_fee_structures(
    user: CurrentUser,
    db: DbSession,
    academic_year_id: uuid.UUID = Query(...),
) -> Any:
    if user.role not in FEES_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    result = await db.execute(
        select(FeeStructure).where(FeeStructure.academic_year_id == academic_year_id)
    )
    return [FeeStructureRead.model_validate(fs) for fs in result.scalars().all()]


# ---------------------------------------------------------------------------
# Fee Records (fees dept creates, students view)
# ---------------------------------------------------------------------------


@router.post("/fees/records", status_code=201, response_model=FeeRecordRead)
async def create_fee_record(body: FeeRecordCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in FEES_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    record = FeeRecord(
        **body.model_dump(),
        status="pending",
        amount_paid=0,
        recorded_by=user.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return FeeRecordRead.model_validate(record)


@router.get("/fees/records", response_model=list[FeeRecordRead])
async def list_fee_records(
    user: CurrentUser,
    db: DbSession,
    student_id: uuid.UUID | None = Query(None),
    fee_status: str | None = Query(None, alias="status"),
) -> Any:
    if user.role not in FEES_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    query = select(FeeRecord)
    if student_id:
        query = query.where(FeeRecord.student_id == student_id)
    if fee_status:
        query = query.where(FeeRecord.status == fee_status)
    result = await db.execute(query.order_by(FeeRecord.created_at.desc()))
    return [FeeRecordRead.model_validate(r) for r in result.scalars().all()]


# ---------------------------------------------------------------------------
# Receipts (fees dept uploads)
# ---------------------------------------------------------------------------


@router.post("/fees/receipts", status_code=201, response_model=ReceiptRead)
async def create_receipt(body: ReceiptCreate, user: CurrentUser, db: DbSession) -> Any:
    if user.role not in FEES_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    receipt = FeeReceipt(**body.model_dump(), uploaded_by=user.id)
    db.add(receipt)

    # Update the fee record's paid amount
    rec_result = await db.execute(select(FeeRecord).where(FeeRecord.id == body.fee_record_id))
    record = rec_result.scalar_one_or_none()
    if record:
        record.amount_paid = (record.amount_paid or 0) + body.amount
        if record.amount_paid >= record.amount:
            record.status = "paid"
            record.paid_date = date_type.fromisoformat(body.payment_date)
        elif record.amount_paid > 0:
            record.status = "partial"

    await db.commit()
    await db.refresh(receipt)
    return ReceiptRead.model_validate(receipt)


# ---------------------------------------------------------------------------
# Student: my fees
# ---------------------------------------------------------------------------


@router.get("/students/me/fees", response_model=StudentFeeSummary)
async def student_fees(user: CurrentUser, db: DbSession) -> Any:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    records_result = await db.execute(
        select(FeeRecord)
        .where(FeeRecord.student_id == user.id)
        .order_by(FeeRecord.created_at.desc())
    )
    records = list(records_result.scalars().all())

    # Get all receipts for these records
    record_ids = [r.id for r in records]
    receipts: list[FeeReceipt] = []
    if record_ids:
        receipts_result = await db.execute(
            select(FeeReceipt)
            .where(FeeReceipt.fee_record_id.in_(record_ids))
            .order_by(FeeReceipt.payment_date.desc())
        )
        receipts = list(receipts_result.scalars().all())

    total_fees = sum(r.amount for r in records)
    total_paid = sum(r.amount_paid for r in records)

    return StudentFeeSummary(
        total_fees=total_fees,
        total_paid=total_paid,
        total_pending=total_fees - total_paid,
        records=[FeeRecordRead.model_validate(r) for r in records],
        receipts=[ReceiptRead.model_validate(r) for r in receipts],
    )
