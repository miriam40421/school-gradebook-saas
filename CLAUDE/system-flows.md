# System Flows

## Topology

```
Browser (3000)
    │
    ▼
Next.js Web (apps/web, port 3000)
    │  REST / fetch
    ▼
NestJS API (apps/api, port 3001)
    │               │
    ▼               ▼
PostgreSQL      MinIO / in-memory
(port 5433)     (port 9000/9001)
via Prisma      S3-compatible storage
```

## Key Flows

### 1. Grade Entry
Browser → POST /api/grades → AuthGuard (JWT) → ownership check (schoolId) → GradeEntry upsert → response

### 2. Certificate Generation
Browser → POST /api/certificates → API → transaction: create CertificateSnapshot → Playwright render PDF → upload to MinIO → return URL

### 3. Auth
Browser → POST /api/auth/login → Passport LocalStrategy → JWT sign → cookie/header return
Subsequent requests → JWT extracted → schoolId + userId validated → attached to request

## Trust Boundaries

- **User input enters** at: REST body, query params, path params
- **Privilege escalates** at: JWT validation in AuthGuard (schoolId extracted from token, never from client body)
- **External storage** at: MinIO uploads (presigned URLs or server-side)
