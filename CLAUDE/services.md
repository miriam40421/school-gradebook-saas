# Services

## Port Map

| Service | Port | Notes |
|---------|------|-------|
| Next.js Web | 3000 | `apps/web` |
| NestJS API | 3001 | `apps/api` |
| PostgreSQL | 5433 | Docker container |
| MinIO API | 9000 | S3-compatible storage |
| MinIO Console | 9001 | Web UI |

## Dev Commands

```bash
# Start DB + MinIO
docker compose up -d

# API dev server
cd apps/api && pnpm dev

# Web dev server
cd apps/web && pnpm dev

# Run all (monorepo root)
pnpm dev
```

## Logs

```bash
# API logs
cd apps/api && pnpm dev   # stdout

# DB logs
docker compose logs -f db

# MinIO logs
docker compose logs -f minio
```

## Tests

```bash
# API unit tests
cd apps/api && pnpm test

# API e2e tests
cd apps/api && pnpm test:e2e

# Web tests
cd apps/web && pnpm test
```
