import traceback
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
    materials,
    me,
    reports,
    submissions,
    timetable,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield


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
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Catch-all exception handler — ensures CORS headers are on error responses
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc) if settings.debug else "Internal server error"},
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
    app.include_router(materials.router, prefix="/api/v1")
    app.include_router(submissions.router, prefix="/api/v1")

    if settings.environment == "local":
        app.include_router(dev.router, prefix="/api/v1")

    return app


app = create_app()
