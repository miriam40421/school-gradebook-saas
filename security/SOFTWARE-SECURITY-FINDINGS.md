# Software Security Findings — my_project (School Gradebook SaaS) — 2026-07-15

> Read-only audit against the 16 software-security principles. No code was modified.
> Scope: `apps/api/src` (NestJS) + `apps/web` (Next.js) + `packages/`.
> Verify pass: /security-review — skipped (no git diff; not applicable to whole-repo audit).

---

## STATUS UPDATE — 2026-07-19

### ✅ Verified already fixed (pre-existing in code)
| Finding | Where |
|---------|-------|
| No global JwtAuthGuard | `app.module.ts:54` — `APP_GUARD: JwtAuthGuard` present |
| Plaintext password in welcome email | `email.service.ts` — sends resetUrl link, no password in body |
| Plaintext password in update email | same — sends resetUrl, no password |
| Password reset token stored plaintext | `auth.service.ts:132` — sha256 hashed before store |
| Access token TTL 24h | `auth.module.ts:25` — already `expiresIn: '15m'` |
| Password reset doesn't revoke JWTs | `auth.service.ts:169` — sets `tokensValidAfter`; JWT strategy checks it |
| syncSubjects non-transactional | `users.service.ts:107` — wrapped in `$transaction` |
| Magic bytes check missing | `import-names.util.ts:43-57` — ZIP + OLE2 magic bytes present |
| upsertLabelOverrides authorization | controller already uses `@HomeroomOrAdmin()` |
| Bare catch swallows errors (students) | catch block propagates error |
| Bare catch swallows errors (classes) | catch block propagates error |
| console.log student names | `console.log` removed |
| postcss CVE | override in `pnpm-workspace.yaml` |
| uuid CVE | override in `pnpm-workspace.yaml` |
| Logout silent fail if no JTI | `auth.controller.ts:97` — throws 400 |
| NODE_ENV filter `!== 'production'` | `http-exception.filter.ts:38` — already `=== 'development'` |
| `/health` endpoint exists | `health.controller.ts` — present with `@Public()` + `@SkipThrottle()` |

### ✅ Fixed in session 2026-07-18/19
| Finding | Fix |
|---------|-----|
| GitHub PAT hardcoded in settings.json (Layer 7) | Moved to `${GITHUB_PAT}` env var; token rotated |
| security-reviewer has Bash (Layer 5) | Removed Bash from tools list |
| `apps/web/.env.local` tracked by git | `git rm --cached` + `**/.env.local` in `.gitignore` |
| `.env.example` NEXT_PUBLIC_API_URL wrong | Changed to `/api-proxy` |
| Certificate storage atomicity | Added `deleteMany` cleanup in catch block |
| Docker resource limits missing | Added `cpus: '1.0'` + `pids: 200` to postgres and minio |
| Root `.env.example` has real credentials | Replaced `school:school` with `<db-user>:<db-password>` placeholder |

### ⏭️ Intentional / deferred
| Finding | Decision |
|---------|----------|
| settingsJson deep validation | Skip — only super-admin can send; low real-world risk |
| students.controller RBAC "inconsistency" | Intentional design: admin read-only on students, service enforces correctly |
| Healthcheck for K8s/load-balancer | Deferred — no Dockerfile yet; revisit when containerising |
| NestJS v10→v11 upgrade | Separate session — needs full regression testing |
| Layer 3 PreToolUse hook | Last task — do after all other work complete |
| Layer 2 permissions.deny | Last task — together with Layer 3 |
| Data-subject rights endpoints (Amendment 13) | Future feature scope |

### ✅ Fixed in session 2026-07-19 (runtime-confirm)
| Finding | Fix |
|---------|-----|
| CORS silent fallback in dev mode | Removed `??` fallback from `main.ts`; `CORS_ORIGIN` now required unconditionally; added to `.env` + `.env.example` |

### 🔴 Still open
| Finding | File | Priority |
|---------|------|----------|
| NestJS v10 injection CVE | Deferred (major upgrade) | 🟠 high |

### ✅ Runtime-confirmed false positives (2026-07-19)
| Finding | Evidence |
|---------|----------|
| API binds to 0.0.0.0 in production | `main.ts:30-31` — already `isDev ? '0.0.0.0' : '127.0.0.1'` |
| `roles.guard.ts` deny-by-default | `roles.guard.ts:23` — already `return false` + `UnauthorizedException` |
| FileInterceptor missing fileSize limit | `certificate-templates.controller.ts:67,80` — `limits.fileSize: 2MB` present |
| purgeExpired() never scheduled | `token-revocation.service.ts:22` — `@Cron(EVERY_HOUR)` present |
| Password reset TTL mismatch | Both `email.service.ts:143` and `auth.service.ts:133` say 2h |

---
> Supply-chain: `pnpm audit --json` — 1,114 packages scanned.

---

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | 8 |
| 🟠 high (supply-chain) | 2 |
| 🟡 risk | 14 |
| 🔵 nit | 9 |

**Principles covered:** 11 / 11 code-auditable + P12 supply-chain

**Top 3 to fix first:**
1. 🔴 `apps/api/src/super-admin/email.service.ts:49` — Plaintext admin password rendered in email body and forwarded through entire call chain
2. 🔴 `apps/api/src/app.module.ts:49` — No global `JwtAuthGuard`; every future controller without an explicit guard is publicly accessible
3. 🔴 `apps/api/src/auth/auth.service.ts:115-119` — Password-reset token stored plaintext in DB; stolen DB backup = full account-takeover tokens

---

## 1. Authentication — FAIL

- 🔴 `apps/api/src/app.module.ts:49` — Only `ThrottlerGuard` is registered as `APP_GUARD`; `JwtAuthGuard` is absent from the global providers, so authentication is opt-in per controller and any future controller added without a `@UseGuards(JwtAuthGuard)` decorator is publicly accessible.
  **Why:** `07-authorization-and-roles.md §Where the check must live`. **Fix:** Add `{ provide: APP_GUARD, useClass: JwtAuthGuard }` to `AppModule.providers`, then mark the two intentionally-public routes (`/auth/*`, `/health`) with a `@Public()` decorator that the guard checks before verifying the token.

- 🔵 `apps/api/src/health/health.controller.ts:5` — `GET /health` has no guard and is intentionally unauthenticated, but no comment or decorator documents the intent; future auditors will flag it as an oversight.
  **Why:** `04-secure-defaults.md §New API is not public by default`. **Fix:** Add `@Public()` (once implemented per finding above) so the bypass is explicit.

---

## 2. Authorization (IDOR / ownership) — WARN

- 🟡 `apps/api/src/certificates/certificates.service.ts:957,975` — `upsertLabelOverrides` and `upsertNikudClassOverrides` call only `assertClassViewAccess`, not `assertCanGenerate`; a `SubjectTeacher` assigned to any class can write school-level settings intended only for homeroom teachers and admins.
  **Why:** `07-authorization-and-roles.md §RBAC`. **Fix:** Call `assertCanGenerate(user, classRow)` inside both methods, or restrict the controller endpoints to `@HomeroomOrAdmin()`.

- 🟡 `apps/api/src/common/guards/roles.guard.ts:16` — When no `@Roles()` decorator is present, `RolesGuard.canActivate` unconditionally returns `true`, meaning any authenticated role passes; as the codebase grows this is a systemic latent risk if a route is missing its decorator.
  **Why:** `07-authorization-and-roles.md §Deny by default`. **Fix:** Invert to deny-by-default (`return false` when no roles set) and introduce `@AnyRole()` / `@Authenticated()` decorators for routes that accept all authenticated users.

- 🔵 `apps/api/src/students/students.controller.ts:29` — The controller-level `@Authenticated()` permits `Admin` and `SubjectTeacher`, but write handlers immediately throw `ForbiddenException` for non-homeroom roles via `assertHomeroomWrite`; the declared RBAC at the routing layer is inconsistent with the enforced policy in the service layer.
  **Why:** `07-authorization-and-roles.md §Where the check must live`. **Fix:** Replace the controller-level decorator with precise `@Roles(Role.HomeroomTeacher)` on write methods so policy is visible at the route.

---

## 3. Input Validation (mass-assignment) — WARN

- 🟡 `apps/api/src/certificates/certificates.controller.ts:80` — `PUT /certificates/label-overrides` and `PUT /certificates/nikud-class-overrides` bind the body as a plain TypeScript interface literal, not a decorated DTO class; `ValidationPipe(whitelist:true)` has no schema to enforce and any body shape is accepted.
  **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** Create `LabelOverridesDto` / `NikudOverridesDto` with `@IsUUID() classId` and `@IsObject() overrides` so the global `ValidationPipe` enforces the shape.

- 🟡 `apps/api/src/gradebook/dto/gradebook.dto.ts:17` — `BulkGradeUpdateItemDto.value` has `@IsOptional()` and `@IsString()` but no `@MaxLength`; a client can submit an arbitrarily long string before Prisma attempts storage.
  **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** Add `@MaxLength(64)` matching the DB column length.

- 🟡 `apps/api/src/school/dto/update-school.dto.ts:10` — `settingsJson` is typed `Record<string, unknown>` with only `@IsObject()`, accepting an arbitrarily deep nested JSON tree with no structure validation; deeply nested objects could cause ReDoS in downstream `normalizeCertificateProfiles`.
  **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** couldn't find a clean fix — needs human decision (options: `ValidateNested` against a typed settings DTO, or a JSON-Schema validator inside `validateCertificateProfileTemplates`).

- 🔵 `apps/api/src/students/dto/student.dto.ts:4` — `fullName` in `CreateStudentDto` / `UpdateStudentDto` has `@MinLength(1)` but no `@MaxLength`; an attacker can create students with arbitrarily long names.
  **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** Add `@MaxLength(255)` matching the DB column.

---

## 4. Data Protection — FAIL

- 🔴 `apps/api/src/super-admin/email.service.ts:49` — The welcome email HTML template renders `${params.adminPassword}` verbatim into the email body; the plaintext admin password travels the entire call chain (controller → service → email service → Resend API) and is emailed to the recipient, capturable by email logs, Resend's servers, inbox scan tools, or any APM agent that serialises request params.
  **Why:** `09-secrets-management.md §Storing user credentials`. **Fix:** Discard the plaintext password immediately after `bcrypt.hash` returns; send the admin a "your account is ready, set your password via this link" notification — never echo plaintext credentials.

- 🔴 `apps/api/src/super-admin/super-admin.service.ts:101` + `email.service.ts:92` — When a super-admin resets a school admin's password via `updateSchool`, `dto.adminPassword` is passed as `changedPassword` to `sendSchoolUpdate` and rendered into the HTML email body; same exposure vector as above.
  **Why:** `09-secrets-management.md §Storing user credentials`. **Fix:** Notify that the password was changed, not what it was changed to; zero out the cleartext value immediately after hashing.

- 🟡 `apps/api/.env:19` — A live Resend API key (`re_6LMRVNKP_…`) and a developer email address are present in `apps/api/.env` on disk; the file is not git-tracked but the key is currently active. If this dev machine is compromised or the key was ever committed in history, it is exploitable.
  **Why:** `09-secrets-management.md §Where secrets must (and must not) live`. **Fix:** Rotate the Resend API key now; confirm via `git log -S "re_6LMRVNKP"` it was never committed; verify `apps/api/.env` is covered by `.gitignore` at workspace level.

---

## 5. Privacy by Design (Amendment 13) — FAIL

- 🟡 `packages/database/prisma/schema.prisma` (whole file) — No `AuditEvent` or event-log table exists; there is no structured record of who performed sensitive actions (grade writes, certificate generation, admin password reset, school block/delete, student record changes). Israeli Privacy Protection Act Amendment 13 requires a verifiable audit trail for access to and modification of personal data.
  **Why:** `10-logging-and-audit.md §What to log (audit trail)`. **Fix:** Add an `AuditEvent` model (fields: `action`, `actorId`, `targetType`, `targetId`, `schoolId`, `ip`, `createdAt`) and emit structured events on grade reads/writes, certificate generation, and all super-admin actions.

- 🟡 `packages/database/prisma/schema.prisma` — No data-retention or scheduled-deletion mechanism exists for any personal-data table (`students`, `users`, `grade_entries`, `certificate_snapshots`); soft-deleted records accumulate indefinitely, conflicting with Amendment 13's storage-limitation principle.
  **Why:** `10-logging-and-audit.md §Operational qualities (retention)`. **Fix:** Implement a scheduled job or administrative endpoint that hard-deletes soft-deleted records past a configurable retention window (e.g., 7 years for Israeli educational records).

- 🔵 `packages/database/prisma/schema.prisma` — No data-subject request endpoints (export-my-data, correct-my-data) are evidenced in the schema or service layer; Amendment 13 grants data subjects the right to access, correct, and receive a copy of their personal data.
  **Why:** `10-logging-and-audit.md §What to log`. **Fix:** Implement data-subject request endpoints and document the deletion/correction flow in the privacy policy.

---

## 6. Sessions & Tokens — FAIL

- 🔴 `apps/api/src/auth/auth.service.ts:115-119` — Password-reset token is generated with `randomBytes(32).toString('hex')` and stored **plaintext** in `PasswordResetToken.token`; a DB read (SQL injection, backup leak, insider) directly yields usable account-takeover tokens.
  **Why:** `06-tokens-and-sessions.md §Password-reset token`. **Fix:** Hash the token with SHA-256 before persisting; compare `sha256hex(incoming)` against the stored hash at verification time.

- 🔴 `apps/api/src/auth/auth.module.ts:23` — Access tokens are signed with `expiresIn: '24h'`; a stolen token remains valid for 24 hours with no rotation mechanism (no refresh-token pair, only a logout-denylist), giving a full-day exploitation window if a token leaks via a log, proxy, or XSS.
  **Why:** `06-tokens-and-sessions.md §JWT §Practice`. **Fix:** Reduce access-token TTL to 15 minutes and introduce a refresh-token pair; or accept the risk and document reliance on the per-request denylist check (already hits DB via `JwtStrategy.validate`).

- 🟡 `apps/api/src/auth/auth.service.ts:128-153` — `resetPassword` hashes the new password and updates the user record but does **not** revoke existing active JWTs; a session hijacker who has a valid token before the password reset retains access until the 24-hour TTL expires.
  **Why:** `06-tokens-and-sessions.md §Lifecycle §On sensitive change`. **Fix:** After a successful password reset, add a `tokensValidAfter` timestamp to the user record and check it in `JwtStrategy.validate`, or mass-revoke all unexpired JTIs for that user into the revoked-tokens table.

- 🔵 `apps/api/src/auth/auth.controller.ts:74-87` — Logout revokes the token only if `user.jti` is truthy; if a JWT was signed before the `jwtid: randomUUID()` call was introduced, logout silently succeeds without adding the token to the denylist.
  **Why:** `06-tokens-and-sessions.md §Revocation`. **Fix:** Reject the logout request with 400 if `jti` is absent, forcing re-authentication with a properly-formed token.

---

## 7. Safe File Handling — FAIL

- 🔴 `apps/api/src/students/import-names.util.ts:49-61` — File type is determined exclusively by the client-supplied filename extension (`.xlsx`, `.docx`, `.csv`) with no magic-byte or MIME content verification; an attacker can upload a malicious payload (zip-bomb, exploit file) renamed to `.csv` and have it parsed by ExcelJS or mammoth without any format check. Note: `mammoth@1.9.0` itself has a directory-traversal CVE (GHSA-rmjr-87wv-gf87) — fix both together.
  **Why:** `08-input-validation-and-injection.md §File uploads`. **Fix:** Verify file content against magic bytes before dispatching to the parser (e.g., use the `file-type` npm package); also bump `mammoth` to `>=1.11.0`.

- 🟡 `apps/api/src/certificate-templates/certificate-templates.controller.ts:67` — `FileInterceptor` on `POST /:id/logo` and `POST /:id/background` has no `limits: { fileSize }` option; multer buffers the entire upload into memory before the 2 MB guard in the service runs, enabling memory exhaustion via a multi-gigabyte upload.
  **Why:** `08-input-validation-and-injection.md §File uploads`. **Fix:** Add `FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } })` on both endpoints.

- 🔵 `apps/api/src/students/import-names.util.ts:48` — `console.log` in production code logs the client-supplied filename and buffer size for every import, sending attacker-controlled strings to the log aggregator.
  **Why:** `10-logging-and-audit.md §What to NEVER log`. **Fix:** Remove the `[import-debug]` debug logs or gate them on `NODE_ENV !== 'production'`.

---

## 9. Logging & Monitoring — FAIL

- 🔴 `apps/api/src/super-admin/email.service.ts:148` — In dev mode (`!this.resend`), the full password-reset URL including the raw reset token is written to the application logger; any log aggregator, syslog, or CI console receives an exploitable account-takeover token.
  **Why:** `10-logging-and-audit.md §What to NEVER log`. **Fix:** Log only a confirmation ("password reset email generated") — never the URL or any part of the token.

- 🟡 `apps/api/src/students/import-names.util.ts:349,365` — Two `console.log` statements in production code; line 365 serialises up to 5 parsed Excel rows as JSON, potentially logging student full names to stdout/log aggregator without any NODE_ENV gate.
  **Why:** `10-logging-and-audit.md §What to NEVER log`. **Fix:** Remove these debug statements entirely.

- 🟡 `apps/api/src/auth/token-revocation.service.ts:21-25` — `purgeExpired()` is never called by any scheduled task; the `revoked_tokens` table grows indefinitely, slowing the per-request revocation lookup.
  **Why:** `10-logging-and-audit.md §Operational qualities (retention)`. **Fix:** Register a `@Cron` or `@Interval` NestJS scheduler calling `purgeExpired()` periodically (e.g., hourly).

---

## 10. Error Handling (Fail-Closed) — FAIL

- 🔴 `apps/api/src/users/users.service.ts:107-112` — `syncSubjects` performs `userSubject.deleteMany` then `userSubject.createMany` as two separate, non-transactional DB writes; if `createMany` fails after `deleteMany` succeeds, the user ends up with no subject assignments (silent data corruption). Called from both `create` and `update` without a wrapping transaction.
  **Why:** `03-error-handling.md §No half-updated state`. **Fix:** Wrap both statements inside a `prisma.$transaction` block.

- 🟡 `apps/api/src/students/students.service.ts:101-110` — A bare `catch {}` swallows every DB error in `StudentsService.list()` and silently falls back to a reduced `studentIncludeBasic` query; a transient Prisma error returns incomplete data as a successful response.
  **Why:** `03-error-handling.md §Don't swallow critical errors`. **Fix:** Remove the catch fallback; propagate the error.

- 🟡 `apps/api/src/classes/classes.service.ts:76-91` — Same swallowed-catch pattern around `prisma.class.findMany`: silently retries with a fallback include, hiding every DB-level error.
  **Why:** `03-error-handling.md §Don't swallow critical errors`. **Fix:** Remove the catch fallback; propagate the error.

- 🟡 `apps/api/src/certificates/certificates.service.ts:706-718` — `storage.putObject` and `prisma.certificateSnapshot.create` are two sequential, non-atomic writes; if the DB insert fails after the storage write, a PDF exists in storage with no DB record (orphaned objects).
  **Why:** `03-error-handling.md §No half-updated state`. **Fix:** Write DB record before storage upload, or clean up the orphaned storage key on error.

- 🟡 `apps/api/src/common/guards/roles.guard.ts:16-17` — When `user` is `undefined` (e.g., `JwtAuthGuard` omitted), accessing `user.role` throws a `TypeError`; NestJS converts this to a 500, not a 401/403 — fails 500 rather than fail-closed 403.
  **Why:** `03-error-handling.md §Fail closed`. **Fix:** Add `if (!user) throw new UnauthorizedException()` before accessing `user.role`.

- 🔵 `apps/api/src/common/filters/http-exception.filter.ts:38-39` — Error detail logging uses `NODE_ENV !== 'production'`; a staging deployment missing this env var defaults to debug behavior and logs raw stack traces to stdout.
  **Why:** `03-error-handling.md §Don't leak error details`. **Fix:** Use `=== 'development'` rather than `!== 'production'` so the default is production-safe.

---

## 11. Secure Defaults — WARN

- 🟡 `apps/api/src/main.ts:12` — When `CORS_ORIGIN` is unset and `NODE_ENV !== 'production'` (e.g., staging or misconfigured container), CORS silently defaults to `http://localhost:3000`; the production HTTPS check only fires for `NODE_ENV === 'production'`, so staging environments may expose the API with a wrong CORS policy rather than a startup error.
  **Why:** `04-secure-defaults.md §Dev env must not behave like prod`. **Fix:** Require `CORS_ORIGIN` explicitly in all non-local environments, or throw at startup if absent and `NODE_ENV !== 'development'`.

- 🔵 `apps/api/prisma/seed.ts:6,33` — Seed script creates a superadmin with a hardcoded known password (`'SuperAdmin1!'`); if accidentally run against a production DB it deletes all data then inserts known-credential accounts. Guarded only by `SEED_DEMO=1`.
  **Why:** `04-secure-defaults.md §Seeded admin creds reachable in prod`. **Fix:** Add `if (process.env.NODE_ENV === 'production') throw new Error('Seed must not run in production')` at the top of the script, independent of the `SEED_DEMO` check.

---

## 12. Supply Chain — WARN

**Production CVEs:**

- 🟠 `apps/api/package.json` — `mammoth@1.9.0` (pinned exactly): directory-traversal when parsing `.docx` files with maliciously crafted embedded paths; reads server files outside the intended directory (GHSA-rmjr-87wv-gf87, affects `>=0.3.25 <1.11.0`).
  **Fix:** Bump `mammoth` to `>=1.11.0`.

- 🟠 `apps/api/package.json` — `@nestjs/core@10.4.22`: injection vulnerability (CWE-74); crafted input reaching NestJS internals can cause injection-class behavior in the framework (GHSA-36xv-jgw5-4q75, affects `<=11.1.17`).
  **Fix:** Upgrade full NestJS suite to `>=11.1.18` (major-version jump from v10 — requires full regression testing).

**Transitive / medium:**

- 🟡 `uuid@8.3.2` (transitive via `exceljs`) — Missing buffer bounds check in v3/v5 when caller supplies a `buf` argument (GHSA-w5hq-g745-h8pq). **Fix:** Upgrade `exceljs` to a release depending on `uuid>=11.1.1`.
- 🟡 `postcss@8.4.31` (transitive via `next`) — XSS via unescaped `</style>` in CSS stringify output (GHSA-qx2v-qp2m-jg93, affects `<8.5.10`). **Fix:** Add `pnpm.overrides: { "postcss": ">=8.5.10" }` or upgrade Next.js.

**Dev-only (not production risk):**
- 🔵 `glob@10.4.5` via `@nestjs/cli` — command injection (GHSA-5j98-mcp5-4vw2). Upgrade `@nestjs/cli`.
- 🔵 `picomatch@4.0.1` via `@nestjs/cli` — ReDoS + method injection (GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p). Upgrade `@nestjs/cli`/`@nestjs/schematics`.
- 🔵 `webpack@5.97.1` via `@nestjs/cli` — SSRF in `buildHttp` if enabled (GHSA-8fgc-7cc6-rx7x). Upgrade `@nestjs/cli`.

**PASS:** lockfile committed (`pnpm-lock.yaml`, 1,114 packages). No `.npmrc` credentials. No typosquat/git-URL deps.

---

## Out-of-code (process/infra) notes

- Rate-limiting (`ThrottlerGuard`) is applied globally — did not audit per-route TTL values against brute-force risk on `/auth/login` and `/auth/forgot-password`; recommend tighter limits on those two routes specifically.
- No HTTPS enforcement observed at the NestJS layer — assumed handled at the proxy/infra level. Run `/infra-audit` to verify.
- `postinstall` hook in root `package.json` compiles first-party packages on every `pnpm install`; document explicitly in CI so `--ignore-scripts` is not accidentally used.

---

## Low-confidence / needs human review

- ❔ `apps/api/src/school/dto/update-school.dto.ts:10` — `settingsJson: Record<string, unknown>` with `@IsObject()` only: potential for deeply nested JSON causing ReDoS in `normalizeCertificateProfiles`, but could not trace the exact downstream regex paths to confirm exploitability. Investigate `normalizeCertificateProfiles` before deciding severity.

---

## Coverage gaps & follow-ups

**Not scanned / out of scope:**
- **Infrastructure layer** (nginx/proxy, Docker, CI secrets, TLS) → run `/infra-audit /home/runner/my_project`
- **Agent hardening** (`.claude/` config, 8 hardening layers) → run `/agent-harden-audit /home/runner/my_project`
- **Israeli privacy law** (Amendment 13, full compliance document) → run `/privacy-audit`
- **Runtime confirmation** of static findings → run `/runtime-confirm` against a running instance
- **E2E behavioral** (login bypass, privilege escalation in the browser) → run `/e2e-security`
- **Next.js frontend** (`apps/web`) — not audited: XSS via `dangerouslySetInnerHTML`, client-side auth guards, token storage in localStorage/cookies not reviewed

**Blind spots within this audit:**
- Cross-file data flows beyond 2 hops not fully traced
- Business-logic authorization edge cases (e.g., submitting grades for a term not assigned to) not exhaustively traced
- No webhook endpoints found in current code; not applicable
- No `$queryRaw` / `$executeRaw` found — confirmed no raw SQL injection risk in current codebase

---

## Method

- Auditors (read-only): `appsec-auditor` ×4 (by domain) + `dependency-auditor` ×1, run in parallel
- Baseline: `secure-code-review/references/02-software-principles.md` (11 code-auditable principles)
- Deep-dives loaded per domain: 06, 07, 08, 09, 10, 11, 12
- Every 🔴 spot-checked against actual code lines before listing
- Supply-chain: `pnpm audit --json` (pnpm v9, lockfile v9.0, 1,114 packages)
