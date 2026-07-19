# E2E Security Findings — my_project — 2026-07-19

> Behavioral end-to-end security test against `http://localhost:3001` (local dev, non-production).
> Browser-MCP: lean-chronoscope v1.2.0. Assert mode: capture-only.
> Seed accounts: admin@demo-a.local, admin@demo-b.local, teacher@demo-a.local, subject@demo-a.local / DemoAdmin1!

---

## Verdict Summary

| Verdict | Count |
|---------|-------|
| 🔴 Confirmed + Fixed | 3 |
| ✅ Safe / Not-reproduced | 7 |

---

## Confirmed Findings (all fixed in this session)

### 1. Logout + GET /me Broken for All Roles — 🔴 CRITICAL → ✅ FIXED

**Root cause:** `RolesGuard` (APP_GUARD) returns `false` when no `@Roles()` decorator is present (deny-by-default). `POST /auth/logout` and `GET /auth/me` had `@UseGuards(JwtAuthGuard)` but no `@Roles()`.

**Runtime evidence:**
```
POST /auth/logout  (valid subject_teacher token) → 403 Forbidden resource
GET  /auth/me      (valid token)                 → 403 Forbidden resource
```

**Impact:** No user of any role could revoke their own session. Stolen tokens remain valid for the full 15-minute TTL with no recourse. `GET /auth/me` completely unusable.

**Fix:**
- `apps/api/src/common/auth-decorators.ts` — added `AnyRole()` decorator: `Roles(...ROLES)` (all 4 roles)
- `apps/api/src/auth/auth.controller.ts` — added `@AnyRole()` to `logout` and `me` handlers
- Verified: POST /auth/logout now returns 200; revocation writes to revokedToken table; reused access token returns 401.

---

### 2. Stored XSS via Student fullName — 🟠 HIGH → ✅ FIXED

**Root cause:** `CreateStudentDto` / `UpdateStudentDto` had `@MaxLength(255)` but no HTML rejection guard. `<script>alert(1)</script>` was accepted, stored verbatim, and echoed in every API response.

**Runtime evidence:**
```
POST /students {"fullName":"<script>alert(1)</script>","classId":"..."}
→ 201 {"id":"e7b72dc6...","fullName":"<script>alert(1)</script>",...}
```

**Impact:** Stored XSS — any front-end rendering `fullName` without escaping executes attacker JS in the teacher/admin's browser.

**Fix:** `apps/api/src/students/dto/student.dto.ts` — added `@Matches(/^[^<>]*$/)` to `fullName` in `CreateStudentDto` and `UpdateStudentDto`. Rejects names containing `<` or `>` with a clear validation error.

---

### 3. Missing MaxLength on `ImportStudentsDto.names` — 🟡 MEDIUM → ✅ FIXED

**Root cause:** `ImportStudentsDto.names` was declared `@IsString({ each: true })` with no `@MaxLength`. The bulk-import path bypassed the `@MaxLength(255)` guard present on `CreateStudentDto`.

**Runtime evidence:**
```
POST /students/import {"classId":"...","names":["AAAA...AAA"]}  (512 chars)
→ 201 {"imported":1,"students":[{"fullName":"AAAA...AAA",...}]}
```

**Impact:** Unbounded string storage via bulk import path; potential DB truncation or storage bloat.

**Fix:** `apps/api/src/students/dto/student.dto.ts` — added `@MaxLength(255, { each: true })` and `@Matches(NO_HTML, { each: true })` to `ImportStudentsDto.names`.

---

## Safe Findings (Not-Reproduced)

| Vuln-class | Result | Evidence |
|------------|--------|----------|
| Auth bypass (no token) | ✅ Safe | All protected routes → 401 |
| Cross-tenant IDOR | ✅ Safe | School-B admin gets 404/403 on school-A resources; list endpoints return own-tenant only |
| Role escalation (subject→admin routes) | ✅ Safe | POST /classes, GET /users, POST /students all → 403 |
| upsertLabelOverrides (subject teacher) | ✅ Safe | PUT /certificates/label-overrides → 403 "Subject teachers cannot generate certificates" |
| BulkGradeUpdateItemDto.value MaxLength | ✅ Safe | `@MaxLength(64)` already present; 512-char → 400 |
| CreateStudentDto.fullName MaxLength | �� Safe | `@MaxLength(255)` already present; 512-char → 400 |
| Refresh token rotation | ✅ Safe | Consumed refresh token → 401 on reuse |

---

## Static Finding Corrections

| Static Claim | Actual Result |
|---|---|
| `roles.guard.ts` deny-by-default (systemic risk) | Confirmed as REAL — caused logout/me to break. Fixed with `@AnyRole()`. |
| `upsertLabelOverrides` uses only `assertClassViewAccess` | False positive — both `assertClassViewAccess` + `assertCanGenerate` are applied |
| `BulkGradeUpdateItemDto.value` no `@MaxLength` | False positive — `@MaxLength(64)` already present |
| `CreateStudentDto.fullName` no `@MaxLength` | False positive — `@MaxLength(255)` already present |

---

## Coverage Limits

- **Not tested:** PDF generation SSRF, file upload content-type abuse, WebSocket channels (none found)
- **Not tested:** Super-admin routes (platform-level; no browser session established)
- **Inconclusive:** Next.js frontend XSS rendering — API-only probes cannot confirm front-end escaping
- **Capture-only mode:** No dual-DB assertion; service-layer scoping verified via source reads + HTTP responses

---

## Method

- Agents: 5 × `e2e-pentester` (parallel), `runtime-verifier`
- Auth: JWT via POST /auth/login per role
- Probes: GET/POST/PUT/PATCH only; no destructive operations
- Cleanup: test records soft-deleted after each scenario
- Stack: pre-running local dev (API 3001, Web 3000, DB 5433)
