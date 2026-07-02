# Phase 01 — Docker & Environment

## Services

| Service | Image | Port |
|---|---|---|
| PostgreSQL 16 | postgres:16-alpine | 5433 (host) → 5432 (container) |
| MinIO | minio/minio:latest | 9000 (API), 9001 (console) |

## Credentials

- DB: user=`school`, pass=`school`, db=`school_gradebook`
- MinIO: `minioadmin` / `minioadmin`

## Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Reset volumes
docker compose down -v
```

## Environment Files

- Root: `.env` (from `.env.example`)
- API: `apps/api/.env` (from `apps/api/.env.example`)
- Web: `apps/web/.env.local` (from `apps/web/.env.example`)
