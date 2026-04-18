# CampusCore API

FastAPI backend for CampusCore. Uses async SQLAlchemy 2.0 with Postgres; Alembic for migrations; uv for dependency management.

## Setup

```bash
# from apps/api/
uv sync              # creates .venv and installs all deps (runtime + dev)
cp .env.example .env # edit DB credentials if needed
```

## Database

Make sure local Postgres is running and the `campuscore` database exists:

```bash
psql -U postgres -c "CREATE DATABASE campuscore;"
```

Run migrations:

```bash
uv run alembic upgrade head
```

Create a new migration after changing a model:

```bash
uv run alembic revision --autogenerate -m "describe change"
```

## Run dev server

```bash
uv run uvicorn app.main:app --reload --port 8000
```

- App: <http://localhost:8000>
- Swagger UI: <http://localhost:8000/api/v1/docs>
- Redoc: <http://localhost:8000/api/v1/redoc>
- Health: <http://localhost:8000/api/v1/health>

## Test / lint / typecheck

```bash
uv run pytest          # unit tests
uv run ruff check .    # lint
uv run ruff format .   # format
uv run mypy app        # type-check
```

## Layout

```
app/
├── main.py          # FastAPI app factory, middleware, router wiring
├── core/            # config, db session, security (JWT verify — Phase 1)
├── models/          # SQLAlchemy ORM models
├── schemas/         # Pydantic request/response schemas
├── routers/         # one file per resource
├── services/        # business logic (pure, testable)
└── utils/           # helpers
alembic/
├── env.py           # migration runner wired to app.core.config
├── script.py.mako   # template for new revisions
└── versions/        # generated migration files
tests/               # pytest
```
