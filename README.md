# CampusCore

College management PWA for a real Indian engineering college (5000+ students, 9 B.Tech branches, 500–1000 faculty). Built to replace paper attendance registers and printed-Excel timetables with a single app every student and faculty member opens daily.

**Status:** Phase 0 — scaffolding complete.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Backend | FastAPI (Python 3.11+) + Pydantic v2 + SQLAlchemy 2.0 async + Alembic |
| Database | PostgreSQL 15+ (local for dev, Supabase in staging/production) |
| Auth | Supabase Auth (later phase) |
| Hosting | Vercel (web) + Google Cloud Run (api) — all free tiers |

## Repository layout

```
campuscore/
├── apps/
│   ├── web/     # Next.js PWA
│   └── api/     # FastAPI backend
├── packages/    # (future) shared types
└── .github/workflows/
```

## Prerequisites (Windows)

- Node.js 20+ and pnpm 10+
- Python 3.11+ with uv (`pip install --user uv`)
- PostgreSQL 15+ running locally (listening on `localhost:5432`)
- Git

## First-time setup

```bash
# 1. install frontend deps
pnpm install

# 2. create local database
psql -U postgres -c "CREATE DATABASE campuscore;"

# 3. install backend deps
cd apps/api
uv sync
cp .env.example .env    # edit DB credentials if needed

# 4. run migrations
uv run alembic upgrade head
cd ../..
```

## Running locally

Open two terminals:

```bash
# terminal 1 — backend on http://localhost:8000 (docs at /api/v1/docs)
cd apps/api
uv run uvicorn app.main:app --reload --port 8000

# terminal 2 — frontend on http://localhost:3000
cd apps/web
cp .env.local.example .env.local   # first time only
pnpm dev
```

## Scripts (from repo root)

```bash
pnpm dev             # start Next.js dev server
pnpm lint            # lint every workspace
pnpm typecheck       # type-check every workspace
pnpm test            # run all tests
pnpm format          # format with Prettier
```

## Roadmap

- **Phase 0** — Foundations (scaffold, CI, local DB) ✅
- **Phase 1** — Auth & user management (Supabase Auth, bulk import)
- **Phase 2** — Academic structure (branches, sections, subjects, faculty assignments)
- **Phase 3** — Timetable management
- **Phase 4** — Lecture attendance
- **Phase 5** — Activity attendance
- **Phase 6** — Admin reports + PWA polish
- **Phase 7** — Hardening + pilot

See the master plan at `C:\Users\rupes\.claude\plans\no-its-ok-lets-vivid-candy.md` for the detailed spec.

## License

MIT — see [LICENSE](LICENSE).
