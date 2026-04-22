import traceback
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import get_settings
from app.routers import (
    activity_attendance,
    admin,
    attendance,
    auth,
    dashboard,
    dev,
    exam,
    fees,
    health,
    hod,
    lookups,
    materials,
    me,
    reports,
    submissions,
    timetable,
)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "600",
}


class CORSErrorMiddleware(BaseHTTPMiddleware):
    """Middleware that ensures CORS headers are on EVERY response, including 500s."""

    async def dispatch(self, request: Request, call_next: object) -> Response:
        # Handle preflight
        if request.method == "OPTIONS":
            return JSONResponse(content={}, headers=CORS_HEADERS)

        try:
            response: Response = await call_next(request)  # type: ignore[operator]
        except Exception:
            traceback.print_exc()
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )

        # Add CORS headers to every response
        for key, value in CORS_HEADERS.items():
            response.headers[key] = value

        return response


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

    # Custom CORS middleware that handles errors properly
    app.add_middleware(CORSErrorMiddleware)

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
    app.include_router(lookups.router, prefix="/api/v1")
    app.include_router(dashboard.router, prefix="/api/v1")

    if settings.environment == "local":
        app.include_router(dev.router, prefix="/api/v1")

    return app


app = create_app()
