from fastapi import APIRouter, status
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import get_settings
from app.core.db import DbSession

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    environment: str
    database: str


@router.get("/health", status_code=status.HTTP_200_OK, response_model=HealthResponse)
async def health(db: DbSession) -> HealthResponse:
    settings = get_settings()
    db_status = "ok"
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar_one()
    except Exception as exc:
        db_status = f"error: {exc.__class__.__name__}"

    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        database=db_status,
    )
