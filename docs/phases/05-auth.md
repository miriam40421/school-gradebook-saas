# Phase 05 — Auth & RBAC

## Roles

| Role | Access |
|---|---|
| Admin | Full access to all school data |
| HomeroomTeacher | Own class: grades, certificates, student list |
| SubjectTeacher | Own subjects only: grades, certificates |

## JWT Flow

1. `POST /auth/login` → returns `accessToken` (JWT)
2. Client stores in `sessionStorage` under `accessToken`
3. All requests: `Authorization: Bearer <token>`
4. `JwtAuthGuard` validates token
5. `RolesGuard` checks `@Roles(...)` decorator

## Guards & Decorators

- `JwtAuthGuard` — validates Bearer token
- `RolesGuard` — RBAC enforcement
- `@CurrentUser()` — injects authenticated user from JWT
- `@Roles(Role.Admin, ...)` — declares required roles

## Demo Credentials

- Admin: `admin@demo-a.local` / `DemoAdmin1!`
- Homeroom: `teacher@demo-a.local` / `DemoAdmin1!`
- Subject (Math): `subject@demo-a.local` / `DemoAdmin1!`
