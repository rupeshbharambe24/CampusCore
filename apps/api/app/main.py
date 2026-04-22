from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import (
    activity_attendance,
    admin,
    attendance,
    auth,
    dev,
    exam,
    fees,
    health,
    hod,
    me,
    reports,
    timetable,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Startup: nothing yet. Add Supabase JWKS fetch here in Phase 1.
    yield
    # Shutdown: SQLAlchemy engine auto-disposes on process exit.


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        openapi_url="/api/v1/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(me.router, prefix="/api/v1")
    app.include_router(admin.router, prefix="/api/v1")
    app.include_router(timetable.router, prefix="/api/v1")
    app.include_router(attendance.router, prefix="/api/v1")
    app.include_router(activity_attendance.router, prefix="/api/v1")
    app.include_router(reports.router, prefix="/api/v1")
    app.include_router(hod.router, prefix="/api/v1")
    app.include_router(exam.router, prefix="/api/v1")
    app.include_router(fees.router, prefix="/api/v1")

    # Dev-only endpoints (seed users, etc.) — only registered in local environment.
    if settings.environment == "local":
        app.include_router(dev.router, prefix="/api/v1")

    return app


app = create_app()
