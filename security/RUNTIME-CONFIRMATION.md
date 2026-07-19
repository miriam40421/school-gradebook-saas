# Runtime Confirmation Report — my_project — 2026-07-19

> Active runtime probes against `http://localhost:3001` (local dev, non-production).
> Static sources: `SOFTWARE-SECURITY-FINDINGS.md`, `INFRA-SECURITY-FINDINGS.md`.
> No destructive requests. GET/HEAD/OPTIONS + source-code reads only.

---

## Summary

| Verdict | Count |
|---------|-------|
| 🔴 Confirmed (fixed) | 1 |
| ✅ Not-reproduced (false positives) | 4 |
| ➖ Not-applicable | 1 |

---

## Findings

### 1. CORS silent fallback — 🔴 CONFIRMED → ✅ FIXED

**Static claim:** `apps/api/src/main.ts:13` — When `CORS_ORIGIN` is unset and `NODE_ENV=development`, server silently starts with `http://localhost:3000` as CORS origin instead of throwing.

**Runtime evidence:**
```
GET /health -H "Origin: http://evil.com"
→ Access-Control-Allow-Origin: http://localhost:3000
(CORS_ORIGIN not in apps/api/.env; fallback was active)
```

**Fix applied:**
- `main.ts:13` — removed `?? (isDev ? 'http://localhost:3000' : null)` fallback. `CORS_ORIGIN` now required unconditionally; throws with clear message if absent.
- `apps/api/.env` — added `CORS_ORIGIN=http://localhost:3000`
- `apps/api/.env.example` — added `CORS_ORIGIN=http://localhost:3000`

---

### 2. API binds to 0.0.0.0 — ✅ NOT-REPRODUCED (false positive)

**Static claim:** `main.ts` — `app.listen(port)` with no host; defaults to 0.0.0.0.

**Runtime evidence:**
```bash
ss -tlnp | grep 3001  →  0.0.0.0:3001 (current dev env)
main.ts:30  →  const host = isDev ? '0.0.0.0' : '127.0.0.1';
main.ts:31  →  await app.listen(port, host);
```
Code explicitly passes host. Dev binds to 0.0.0.0 intentionally; production binds to 127.0.0.1. Finding was written against an older version.

---

### 3. roles.guard deny-by-default — ✅ NOT-REPRODUCED (false positive)

**Static claim:** `roles.guard.ts:16` — returns `true` when no `@Roles()` present; TypeError if user undefined.

**Evidence:**
```ts
// roles.guard.ts:23
if (!requiredRoles?.length) { return false; }   // deny when no roles set ✅
// roles.guard.ts:27
if (!user) throw new UnauthorizedException();    // 401 not TypeError ✅
```
Both sub-issues already fixed in current code.

---

### 4. FileInterceptor missing fileSize limit — ✅ NOT-REPRODUCED (false positive)

**Static claim:** `certificate-templates.controller.ts:67` — `FileInterceptor` has no `limits.fileSize`; memory exhaustion possible.

**Evidence:**
```ts
// line 67
FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } })
// line 80 (background endpoint)
FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } })
```
Multer-level limit already present on both endpoints.

---

### 5. purgeExpired() never scheduled — ✅ NOT-REPRODUCED (false positive)

**Static claim:** `token-revocation.service.ts:21-25` — `purgeExpired()` never called by scheduler.

**Evidence:**
```ts
// token-revocation.service.ts:22
@Cron(CronExpression.EVERY_HOUR)
purgeExpired() { ... }
```
`@Cron` decorator is present; NestJS ScheduleModule fires it hourly automatically.

---

### 6. Password reset TTL mismatch — ➖ NOT-APPLICABLE

**Static claim:** email says "2h" but actual token TTL may differ.

**Evidence:**
```ts
// email.service.ts:143  →  "הקישור בתוקף ל-2 שעות בלבד."
// auth.service.ts:133   →  new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
```
Both are 2h — no mismatch exists. Finding was incorrect.

---

## False-positive cleanup

The following "Still open" items in `SOFTWARE-SECURITY-FINDINGS.md` should be moved to "Verified already fixed":
- API binds to 0.0.0.0
- roles.guard deny-by-default  
- FileInterceptor missing fileSize limit
- purgeExpired() never scheduled
- Password reset TTL mismatch

---

## Method

- Agents: 5 × `runtime-verifier` (parallel)
- Probes: `ss -tlnp`, `curl -I` with foreign Origin header, source-code reads
- No auth tokens acquired; no writes; no destructive requests
- Stack: pre-running local dev (API port 3001, Web port 3000)
