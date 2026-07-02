# Database

## Stack

- **Engine**: PostgreSQL 16 (Docker)
- **ORM**: Prisma 6
- **Schema**: `apps/api/prisma/schema.prisma`

## Connection

```
Host: localhost
Port: 5433
Database: (see docker-compose.yml / .env)
```

## Key Models

- `User` — school admin/teacher, softDelete, UUID PK, schoolId FK
- `Student` — softDelete, UUID PK, schoolId FK
- `GradeEntry` — unique(schoolId, studentId, subjectId, termId)
- `GradingTerm` — has `isLocked` flag
- `CertificateSnapshot` — immutable after creation, no UPDATE/DELETE

## Prisma Commands

```bash
# Generate client
cd apps/api && pnpm prisma generate

# Run migrations
cd apps/api && pnpm prisma migrate dev

# Open Prisma Studio
cd apps/api && pnpm prisma studio
```
