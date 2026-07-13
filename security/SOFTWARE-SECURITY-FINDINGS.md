# Software Security Findings — my_project — 2026-07-08

> Read-only audit against the 11 code-auditable software-security principles + supply-chain (P12).
> No code was modified.
> Scope: `/home/runner/my_project` (NestJS 10 + Next.js 14 + Prisma 6 + pnpm monorepo).
> Verify pass: `/security-review` — skipped (no diff context; full-codebase audit not diff-scoped).

---

## Summary

| Severity | Count | Notes |
|---|---|---|
| 🔴 critical | 14 | 2 code + 12 supply-chain CVEs (prod) |
| 🟡 risk | 48 | 21 code + 17 supply-chain prod moderate + 10 dev |
| 🔵 nit | 9 | code only |

**Principles covered:** 11 / 11 code-auditable + P12 supply-chain
**Domains:** authn/authz · input/files · data/secrets/sessions · errors/defaults · supply-chain

**Top 3 to fix first:**
1. 🔴 `apps/api/src/auth/auth.controller.ts:17` — logout is a no-op; JWT token stays valid 24 h after "logout"
2. 🔴 `apps/api/src/auth/auth.controller.ts:12` — login events (success & failure) never logged — brute-force invisible
3. 🔴 `xlsx@0.18.5` — Prototype Pollution CVE in student-import; no safe npm upgrade path (GHSA-4r6h-8v6p-xvw6)

---

## 1. Authentication — WARN

- 🟡 `apps/api/src/auth/jwt.strategy.ts:17` — when `JWT_SECRET` is absent and `NODE_ENV` is not `'test'`, strategy falls back to hardcoded `'test-secret'`; if `NODE_ENV` is unset in staging, JWTs signed with the known key are silently accepted.
  **Why:** `02-software-principles.md §1 Authentication`. **Fix:** remove `?? 'test-secret'`; throw unconditionally when secret is absent so the process fails to start.

- 🔵 `apps/api/src/health/health.controller.ts:1` — `GET /health` has no auth guard and is not documented as an intentionally public route.
  **Why:** `02-software-principles.md §1`. **Fix:** add a comment/doc marking it public, or add an IP-level restriction if internal-only.

---

## 2. Authorization (IDOR / ownership) — WARN

- 🟡 `apps/api/src/students/students.controller.ts:42` — POST/PATCH/DELETE student mutations are auth-guarded at class level (any valid JWT) then enforce `HomeroomTeacher` role via a runtime throw in `assertHomeroomWrite()`; no `RolesGuard` at the method level. A future change that moves the service call could silently open mutations to other roles.
  **Why:** `07-authorization-and-roles.md §Where the check must live`. **Fix:** add `@Roles(Role.HomeroomTeacher)` + `RolesGuard` at the method/class level, not only inside the service.

- 🔵 `apps/api/src/students/students.service.ts:156-162` — the final `findFirst` after `updateGroupMemberships` queries by bare `id` with no `schoolId` scope, unlike every other student read in this file which scopes to `schoolId: user.school_id`. Ownership has already been verified earlier, so this is low-risk but inconsistent.
  **Why:** `07-authorization-and-roles.md §IDOR`. **Fix:** add `schoolId: user.school_id` to the `where` clause of the terminal `findFirst`.

---

## 3. Input Validation — WARN

- 🔵 `packages/certificate-layout/src/validate-layout.ts:100-116` — `validateStyle` validates `color`, `textAlign`, `fontSizePt` but not `fontFamily` or `fontWeight`; `blockStyleCss` wraps `fontFamily` with `escapeHtml` but a value like `"Arial; background: red"` can inject an extra CSS property via the unquoted style attribute.
  **Why:** `08-input-validation-and-injection.md §XSS`. **Fix:** add an allowlist for `fontWeight` (`normal|bold|600`) and validate `fontFamily` against a known-safe list or a strict regex rejecting `;`, `<`, `>`, `"`, `'`.

- 🔵 `apps/api/src/school/dto/update-school.dto.ts:10-11` — `settingsJson` is `Record<string, unknown>` with only `@IsObject()`; shape, depth, and value types are unconstrained and stored verbatim to drive certificate generation.
  **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** define a strict typed DTO for settings shape, or add a depth/size cap before persistence.

- 🔵 `apps/api/src/certificates/dto/certificate-supplements.dto.ts:44-49` — `gradeComments` and `nikudOverrides` are `Record<string, string | null>` with only `@IsObject()`; key count and value length are unbounded.
  **Why:** `08-input-validation-and-injection.md §Validation strategy`. **Fix:** add a custom validator capping key count and value length.

> **PASS checks:** All DTOs use `whitelist: true, forbidNonWhitelisted: true` globally. No `$queryRaw`/`$executeRaw` found. No `Object.assign(entity, body)` from raw request. Handlebars templates use `{{}}` (HTML-escaped). No shell calls / path traversal.

---

## 4. Data Protection — WARN

- 🟡 `apps/api/src/auth/dto/login.dto.ts:8` — `LoginDto.password` has only `@MinLength(1)` (bare `@IsString`); at registration `CreateUserDto` requires `@MinLength(8)`. A user who set a 1-char password (or whose password was reset to one) can log in but the constraints are decoupled and no complexity rule exists.
  **Why:** `09-secrets-management.md §Storing user credentials`. **Fix:** apply `@MinLength(8)` on `LoginDto.password`; add `@IsStrongPassword()` on `CreateUserDto`/`UpdateUserDto`.

- 🟡 `apps/api/src/auth/jwt-payload.interface.ts:4` — JWT payload embeds `email` as a plain claim; email is PII carried in a base64-decodable token on every request and visible in proxy/CDN access logs.
  **Why:** `06-tokens-and-sessions.md §JWT`. **Fix:** remove `email` from the payload; look it up from DB on `/auth/me` only.

---

## 5. Privacy by Design (Amendment 13) — WARN

- 🟡 `apps/api/src/students/students.service.ts:243` and `apps/api/src/users/users.service.ts:223` — **hard (physical) deletes** on `Student` and `User`. This violates the project's own CLAUDE.md rule ("SoftDeletes: על ישויות עסקיות — User, Student …"), eliminates the audit trail of who set which grades, and makes it impossible to fulfill data-subject access/portability requests.
  **Why:** `02-software-principles.md §5 Privacy by design`; `04-secure-defaults.md §deletion-not-always-immediate-final`. **Fix:** add `deletedAt DateTime?` to `User` and `Student` Prisma models; convert `delete` to `update({ data: { deletedAt: new Date() } })`; filter `where: { deletedAt: null }` on all reads. (Architecture: this is already a documented project invariant — enforce it.)

---

## 6. Sessions & Tokens — FAIL

- 🔴 `apps/api/src/auth/auth.controller.ts:17-19` — `POST /auth/logout` is a no-op: no `@UseGuards(JwtAuthGuard)`, returns `{ success: true }` with zero server-side action. Because tokens are stateless and 24 h long-lived, a stolen or session-hijacked token remains fully valid for the rest of its TTL after the user "logs out".
  **Why:** `06-tokens-and-sessions.md §Lifecycle`. **Fix:** implement a `jti` denylist (Redis/DB) checked in `validate()`, or reduce token TTL to 15 min and add refresh-token rotation with server-side revocation.

- 🟡 `apps/api/src/auth/auth.module.ts:21` — JWT `expiresIn` is `'24h'`; a stolen token grants full access for 24 hours with no revocation path.
  **Why:** `06-tokens-and-sessions.md §JWT`. **Fix:** reduce to `15m` and implement a refresh token flow; or add a per-user `tokensValidAfter` timestamp checked in `validate()`.

- 🟡 `apps/api/src/auth/jwt.strategy.ts:14-18` — `passport-jwt` `Strategy` constructed without an `algorithms` option; the algorithm is taken from the token header. A forged token with `alg:none` may bypass verification on some passport-jwt versions.
  **Why:** `06-tokens-and-sessions.md §JWT`. **Fix:** add `algorithms: ['HS256']` to the `super({...})` constructor options.

---

## 7. Safe File Handling — WARN

- 🟡 `apps/api/src/certificate-templates/certificate-templates.controller.ts:67,80` — `FileInterceptor('file')` has no `limits` option; the entire request body is buffered in memory before the 2 MB size guard in the service runs.
  **Why:** `08-input-validation-and-injection.md §File uploads`. **Fix:** add `limits: { fileSize: 2 * 1024 * 1024 }` in the `FileInterceptor` options so multer rejects oversized requests at the HTTP layer.

- 🟡 `apps/api/src/certificate-templates/certificate-templates.service.ts:237` — MIME check relies on `file.mimetype`, which multer derives from the client-supplied `Content-Type` header, not magic-byte inspection. An attacker can upload an HTML/SVG file with `Content-Type: image/png` and bypass the allowlist.
  **Why:** `08-input-validation-and-injection.md §File uploads`. **Fix:** use a magic-byte library (e.g. `file-type`) to detect true content type from `file.buffer` before the allowlist check.

- 🟡 `apps/api/src/students/import-names.util.ts:47-66` — file type for student import is determined solely by filename extension (`lower.endsWith('.docx')`); a crafted file with a `.docx` extension but malicious content (XML bomb, malformed binary) will be passed to `mammoth`/`xlsx` parsers without real type verification.
  **Why:** `08-input-validation-and-injection.md §File uploads`. **Fix:** add magic-byte detection (`file-type`) to verify content matches the declared extension; cap per-document complexity before parsing.

---

## 8. Secure Communication — WARN

- 🟡 `apps/api/src/auth/auth.service.ts:16-44` — no rate limiting on `POST /auth/login`; unlimited password guesses accepted with no lockout, delay, or CAPTCHA, enabling online brute-force of any account.
  **Why:** `11-secure-communication.md §Rate limiting`. **Fix:** add `@nestjs/throttler` with a strict limit (e.g. 5 attempts / 15 min per IP+email) on the login route.

---

## 9. Logging & Monitoring — FAIL

- 🔴 `apps/api/src/auth/auth.controller.ts:12-15` — login success and login failure are never logged. No audit trail for authentication events (who, from where, outcome) — brute-force attacks and account-takeover attempts are completely invisible.
  **Why:** `10-logging-and-audit.md §What to log (audit trail)`. **Fix:** log `{ event: 'login_success' | 'login_failure', userId/email, ip, timestamp }` in `AuthService.login()` using a structured logger (not `console`).

- 🟡 `apps/api/src/users/users.service.ts:196-207` — password change triggers no audit log event; no record of who changed whose password, when, or from which IP.
  **Why:** `10-logging-and-audit.md §What to log`. **Fix:** emit `{ event: 'password_changed', actorId, targetUserId, schoolId, timestamp }` when `dto.password` is set.

- 🟡 `apps/api/src/certificates/certificates.controller.ts:92-103` — `GET /certificates/snapshots/:id/pdf` (certificate download containing student PII) is not audit-logged; bulk or unauthorized downloads leave no trace.
  **Why:** `10-logging-and-audit.md §What to log`. **Fix:** log `{ event: 'certificate_downloaded', actorId, snapshotId, studentId, schoolId, timestamp }`.

- 🟡 `apps/api/src/common/filters/http-exception.filter.ts:38-39` — unhandled errors are printed via `console.error(exception)` when `NODE_ENV !== 'production'`; a DB/Prisma error can expose query strings, connection strings, or PII in stdout on a misconfigured staging server.
  **Why:** `10-logging-and-audit.md §Anti-patterns`. **Fix:** always use a structured logger (NestJS `Logger`) and scrub the raw exception; never gate on `NODE_ENV !== 'production'` as a security control.

- 🔵 `apps/api/src/users/users.service.ts:165-207` — role grants and demotions are not audit-logged.
  **Why:** `10-logging-and-audit.md §What to log`. **Fix:** emit `{ event: 'role_changed', actorId, targetUserId, fromRole, toRole, schoolId, timestamp }` when `dto.role` changes.

---

## 10. Error Handling (fail-closed) — WARN

- 🟡 `apps/api/src/students/students.service.ts:100-110` — on any Prisma exception, the `list` method silently retries with a reduced include (`studentIncludeBasic`), swallowing the error with no log. A permission or schema error causes a wrong response instead of surfacing the fault.
  **Why:** `03-error-handling.md §dont-swallow-critical-errors`. **Fix:** narrow the catch to `PrismaClientKnownRequestError` for schema-compatibility only; log the original error before retrying.

- 🟡 `apps/api/src/classes/classes.service.ts:76-91` — same silent fallback pattern on `class.findMany`; transient DB failures are invisible in production logs.
  **Why:** `03-error-handling.md §dont-swallow-critical-errors`. **Fix:** same as above.

- 🟡 `apps/api/src/certificates/certificates.service.ts:492-589` — inside `generate()`, the per-student loop writes S3 first then creates the DB `CertificateSnapshot`; if the DB write fails after S3 succeeds, the PDF is orphaned in storage with no compensation or rollback.
  **Why:** `03-error-handling.md §no-half-updated-state`. **Fix:** write the DB row first (capturing `snapshotId`), then upload to S3; or mark the row `draft` until S3 confirms, then flip to `ready`.

- 🟡 `apps/api/src/users/users.service.ts:103-113` — `syncSubjects` issues `deleteMany` then `createMany` outside any transaction; a `createMany` failure after `deleteMany` succeeds leaves the user with no subject assignments (invalid `SubjectTeacher` state).
  **Why:** `03-error-handling.md §no-half-updated-state`. **Fix:** wrap both in `this.prisma.$transaction(async tx => { ... })`.

- 🟡 `apps/api/src/users/users.service.ts:144-162` — `create` for a `SubjectTeacher` calls `prisma.user.create` then `syncSubjects` outside a transaction; a `syncSubjects` failure leaves an orphan user record.
  **Why:** `03-error-handling.md §no-half-updated-state`. **Fix:** wrap user creation and subject sync in a single `$transaction`.

- 🔵 `apps/api/src/certificates/certificates.service.ts:808-810` — S3 cache-refresh write is silently swallowed (`// Best-effort cache refresh.`) with no logging; persistent S3 failures are invisible.
  **Why:** `03-error-handling.md §dont-swallow-critical-errors`. **Fix:** log at `warn` level so operational issues are observable.

---

## 11. Secure Defaults — WARN

- 🟡 `apps/api/src/main.ts:8` — Helmet is never called on the NestJS app; no `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, or other security headers are set on any response.
  **Why:** `04-secure-defaults.md §dev-environment-doesnt-behave-like-prod`. **Fix:** `import helmet from 'helmet'; app.use(helmet());` before `app.listen`.

- 🟡 `apps/api/src/main.ts:8` — `enableCors` defaults to `origin: 'http://localhost:3000'` when `CORS_ORIGIN` is unset; no startup assertion validates the env-provided value is not a wildcard `*` in production.
  **Why:** `04-secure-defaults.md §dev-environment-doesnt-behave-like-prod`. **Fix:** assert at startup that `CORS_ORIGIN` is set in production and is not `*`.

- 🔵 `apps/api/src/storage/storage.module.ts:14` — when S3 credentials are absent in production, the module silently falls back to in-memory storage and logs only a warning; certificate PDFs are lost on restart with no startup error thrown.
  **Why:** `04-secure-defaults.md §dev-environment-doesnt-behave-like-prod`. **Fix:** in production, treat missing S3 credentials as a fatal startup error (`throw new Error(...)`).

---

## 12. Supply-Chain — FAIL (critical)

### Production — Critical / High CVEs

| Package | CVE anchor | Severity | Problem | Fix |
|---|---|---|---|---|
| `xlsx@0.18.5` | GHSA-4r6h-8v6p-xvw6 | 🔴 High | Prototype Pollution — parsing malicious `.xlsx` mutates `Object.prototype`, potential RCE/auth-bypass | Replace with `exceljs` (no safe npm upgrade path for xlsx) |
| `xlsx@0.18.5` | GHSA-5pgg-2g8v-p4x9 | 🔴 High | ReDoS — crafted cell content causes CPU exhaustion | Same — replace xlsx |
| `next@14.2.35` | GHSA-h25m-26qc-wcjf | 🔴 High | RSC DoS — crafted HTTP request body crashes the Next.js runtime | Bump next to `>=15.0.8` |
| `next@14.2.35` | GHSA-q4gf-8mx6-v5v3 | 🔴 High | RSC DoS variant | Bump next to `>=15.5.15` |
| `next@14.2.35` | GHSA-8h8q-6873-q5fj | 🔴 High | RSC DoS variant 2 | Bump next to `>=15.5.16` |
| `next@14.2.35` | GHSA-c4j6-fc7j-m34r | 🔴 High | SSRF via WebSocket upgrade — Next.js proxy logic does not validate target URL | Bump next to `>=15.5.16` |
| `next@14.2.35` | GHSA-36qx-fr4f-26g5 | 🔴 High | i18n Middleware auth bypass (Pages Router) | Bump next to `>=15.5.16` |
| `multer@2.0.2` (via `@nestjs/platform-express`) | GHSA-xf7r-hgr6-v32p | 🔴 High | DoS — incomplete cleanup on aborted upload | `pnpm.overrides.multer: ">=2.2.0"` |
| `multer@2.0.2` | GHSA-v52c-386h-88mc | 🔴 High | DoS — file-handle exhaustion under error conditions | Same |
| `multer@2.0.2` | GHSA-5528-5vmv-3xc2 | 🔴 High | DoS — resource exhaustion | Same |
| `multer@2.0.2` | GHSA-72gw-mp4g-v24j | 🔴 High | DoS — aborted upload cleanup | Same |
| `lodash@4.17.21` (via `@nestjs/config`) | GHSA-r5fr-rjxr-66jc | 🔴 High | Code Injection via `_.template` with attacker-controlled `imports` key | `pnpm.overrides.lodash: ">=4.17.24"` |

### Production — Moderate CVEs (selected)

| Package | CVE anchor | Problem | Fix |
|---|---|---|---|
| `mammoth@1.9.0` | GHSA-rmjr-87wv-gf87 | Directory Traversal via crafted `.docx` embedded paths — reads arbitrary server files | Bump mammoth to `>=1.11.0` |
| `next@14.2.35` | GHSA-ggv3-7p47-pfv8 | HTTP request smuggling via malformed `Transfer-Encoding` | Bump next `>=15.5.13` |
| `next@14.2.35` | GHSA-ffhc-5mcf-pf4q | XSS — CSP nonce incorrectly serialized in App Router | Bump next `>=15.5.16` |
| `next@14.2.35` | GHSA-gx5p-jg67-6x7h | XSS — `beforeInteractive` Script props not escaped | Bump next `>=15.5.16` |
| `next@14.2.35` | GHSA-wfc6-r584-vfw7 | RSC cache poisoning — cross-user payload contamination | Bump next `>=15.5.16` |
| `@nestjs/core@10.4.22` | GHSA-36xv-jgw5-4q75 | Injection via unsanitized serialization paths | Bump `@nestjs/*` to `>=11.1.18` |
| `lodash@4.17.21` | GHSA-f23m-r3pf-42rh | Prototype Pollution via `_.unset`/`_.omit` | `pnpm.overrides.lodash: ">=4.17.24"` |
| `file-type@20.4.1` | GHSA-5v7r-6r5c-r473 | Infinite loop DoS in ASF parser | `pnpm.overrides.file-type: ">=21.3.1"` |
| `postcss@8.4.31` | GHSA-qx2v-qp2m-jg93 | XSS via unescaped `</style>` in CSS output | Resolved by bumping `next` (which pins postcss) |
| `qs@6.14.2` | GHSA-q8mj-m7cp-5q26 | DoS via `stringify` crash | `pnpm.overrides.qs: ">=6.15.2"` |

### Dev-only — High (build surface)

| Package | CVE anchor | Problem |
|---|---|---|
| `glob@10.4.5` | GHSA-5j98-mcp5-4vw2 | Command injection in glob CLI — risk if CI invokes glob with external input |
| `tmp@0.0.33` | GHSA-ph9p-34f9-6g65 | Symlink attack enabling arbitrary file write (via `@nestjs/cli`) |

### Configuration

- `xlsx@^0.18.5` uses `^` float — range pins to a permanently vulnerable line; no safe npm upgrade exists. **Replace the package.**
- `postinstall` in root `package.json` runs workspace builds on every `pnpm install`; `--ignore-scripts` cannot be used without breaking the build. **Move pre-build to an explicit CI step.**

---

## Out-of-code (process/infra) notes

- **Infra:** TLS, nginx proxy config, Docker security not checked here → run `/infra-audit`.
- **Agent hardening:** `.claude/` config not audited here → run `/agent-harden-audit`.
- **Runtime verification:** static findings should be confirmed on a running instance → run `/runtime-confirm` on high-severity items.
- **pnpm.onlyBuiltDependencies** correctly restricts third-party install scripts to `@prisma/*` — this is good practice, keep it.

---

## Low-confidence / needs human review

- ❔ `apps/api/src/prisma/prisma.service.ts` — could not confirm whether `PrismaClient` is constructed with `log: ['query']`; if enabled, SQL with parameter values (including `passwordHash` fields or PII) would be emitted to stdout. **Recheck:** read `prisma.service.ts` and check `new PrismaClient({ log: ... })`.

---

## Coverage gaps & follow-ups

- **Not scanned:** frontend (Next.js pages/components) for client-side XSS / state management leaks
- **Not scanned:** business-logic flows (grade locking, snapshot immutability) — verified as rule in CLAUDE.md but not traced in code paths
- **Not traced cross-file:** full request lifecycle from Next.js frontend → NestJS API for multi-hop auth bypasses
- **Infra out of scope:** Docker, nginx, MinIO, PostgreSQL config → `/infra-audit`
- **Runtime behavior out of scope:** actual HTTP probes → `/runtime-confirm <report> <url>` on 🔴 findings
- **Discarded (no confirmation):** prisma query-log finding — moved to Low-confidence section

---

## Method

- Auditors (read-only): `appsec-auditor` × 4 (by domain) + `dependency-auditor` × 1, all run in parallel
- Baseline: `secure-code-review/references/02-software-principles.md` (16 principles)
- Deep-dives loaded: `07`, `08`, `09`, `10`, `11`, `03`, `04`, `12`
- Each 🔴 code finding spot-checked against actual source lines before listing
- Supply-chain: `pnpm audit --json` (1049 deps, 305 prod / 733 dev); GHSA anchors verified by scanner output
- `/security-review`: skipped — no diff context; full-codebase audit
