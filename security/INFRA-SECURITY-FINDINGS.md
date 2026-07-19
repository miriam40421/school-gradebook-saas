# Infrastructure Security Findings — my_project — 2026-07-15

> Read-only audit of domain-2 infra config (proxy · ports · TLS/headers · containers · secrets/CI).
> No config was modified. Scope: `/home/runner/my_project`.
> This audits *config*, not live behavior — confirm reachability with `runtime-verify`.

---

## STATUS UPDATE — 2026-07-19

### ✅ Verified already fixed (pre-existing in code)
| Finding | Where |
|---------|-------|
| Postgres bound to 0.0.0.0 | `docker-compose.yml:7` — already `127.0.0.1:5433:5432` |
| MinIO bound to 0.0.0.0 | `docker-compose.yml:32-33` — already `127.0.0.1:9002:9000` + `127.0.0.1:9003:9001` |
| MinIO floating `latest` tag | `docker-compose.yml:28` — pinned to `RELEASE.2025-04-22T22-12-26Z` |
| Postgres + MinIO no healthcheck | Both have `healthcheck:` directives |

### ✅ Fixed in session 2026-07-18/19
| Finding | Fix |
|---------|-----|
| No resource limits on containers | Added `cpus: '1.0'` + `pids: 200` to both services |
| `apps/web/.env.local` tracked by git | `git rm --cached` + `**/.env.local` in `.gitignore` |
| Root `.env.example` real credentials | Replaced with `<db-user>:<db-password>` placeholder |
| `.env.example` NEXT_PUBLIC_API_URL wrong | Changed to `/api-proxy` |

### ⏭️ Intentional / deferred
| Finding | Decision |
|---------|----------|
| No reverse proxy / nginx committed | Infra-ops concern; not in repo scope |
| Postgres image not pinned to patch | Low priority; acceptable for dev |
| Layer 3 PreToolUse hook | Last task — do after all other work complete |
| Layer 2 permissions.deny | Last task — together with Layer 3 |
| No CI secret-scan | Deferred until CI is set up |

### 🔴 Still open
| Finding | File | Priority |
|---------|------|----------|
| Inter-service traffic HTTP (not HTTPS) | `next.config.ts` proxy → `http://localhost:3001` | 🔵 nit (localhost only) |
| docker-compose default credentials | `school:school` + `minioadmin` in compose | 🔵 dev-only acceptable |

### ✅ Runtime-confirmed false positive (2026-07-19)
| Finding | Evidence |
|---------|----------|
| API binds to 0.0.0.0 in production | `main.ts:30-31` — already `isDev ? '0.0.0.0' : '127.0.0.1'` |

---

---

## Summary

| Severity | Count |
|---|---|
| 🔴 critical | 0 |
| 🟡 risk | 9 |
| 🔵 nit | 4 |

**Top 3 to fix first:**
1. 🟡 `docker-compose.yml: ports "5433:5432"` — Postgres + MinIO bind to 0.0.0.0, not localhost — reachable on all network interfaces in any non-loopback environment
2. 🟡 `docker-compose.yml: minio/minio:latest` — floating image tag; uncontrolled drift to unpatched MinIO versions
3. 🟡 `apps/web/next.config.ts` — No security-headers config; Next.js does not emit CSP / X-Frame-Options / Referrer-Policy on HTML responses

---

## Network exposure / ports / proxy — WARN

- 🟡 `docker-compose.yml: postgres ports "5433:5432"` — Postgres published on `0.0.0.0:5433` (all interfaces); any host on the same LAN or cloud VPC can reach the DB port directly. **Why:** `02-network-and-ports.md §published-ports`. **Fix:** Change to `127.0.0.1:5433:5432` so only same-host processes can connect, or drop `ports:` and use `expose:` (only API container needs it).

- 🟡 `docker-compose.yml: minio ports "9002:9000" / "9003:9001"` — MinIO API and admin console both published on `0.0.0.0`; the admin console (9003) is an admin UI with full bucket management. **Why:** `02-network-and-ports.md §published-ports`. **Fix:** Bind both to `127.0.0.1` (`127.0.0.1:9002:9000`, `127.0.0.1:9003:9001`) or restrict console port to localhost only.

- 🟡 `apps/api/src/main.ts: await app.listen(port)` — NestJS binds to `0.0.0.0` by default; API port 3001 is reachable on all network interfaces, not only from the local Next.js proxy. If a cloud machine, the API is internet-reachable with no WAF in front. **Why:** `02-network-and-ports.md §CORS-host-binding`. **Fix:** In production bind to `127.0.0.1` (`app.listen(port, '127.0.0.1')`) and route external traffic through the proxy only.

- 🟡 `apps/web/next.config.ts: destination "http://localhost:3001"` — The Next.js rewrite proxies `/api-proxy/:path*` to the API over plain HTTP. If the API and web server run on different hosts in production, this is unencrypted inter-service traffic. **Why:** `03-tls-and-headers.md §HTTPS-enforced`. **Fix:** Use `https://` destination in production, or keep API on the same host so localhost traffic stays loopback.

- 🔵 No reverse proxy / nginx config committed — there is no `nginx.conf`, no Traefik labels, and no cloud-LB config in the repo; TLS termination, HTTP→HTTPS redirect, and header injection are not verifiable. **Why:** `02-network-and-ports.md §proxy-routing`. **Fix:** Commit proxy config to the repo; document the ingress topology in `CLAUDE/deploy.md`.

---

## TLS / HTTPS / security headers — WARN

- 🟡 `apps/web/next.config.ts` — No `headers()` config defined; Next.js HTML responses carry no `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. Helmet is only applied to the NestJS API (`main.ts`), not to the Next.js frontend. **Why:** `03-tls-and-headers.md §security-headers`. **Fix:** Add a `headers()` export to `next.config.ts`:
  ```ts
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        // Add Content-Security-Policy once inline script audit done
      ],
    }];
  }
  ```

- ✅ `apps/api/src/main.ts: use(helmet())` — Helmet middleware applied to NestJS API; covers `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` (when HTTPS), and a default CSP. Good.

- 🔵 TLS version / ciphers — not auditable; no proxy config committed. Assumed handled at load-balancer/cloud level. Confirm with `runtime-verify` or infra-ops review.

---

## Containers / images / compose — WARN

- 🟡 `docker-compose.yml: image: minio/minio:latest` — Floating `latest` tag; any `docker compose pull` or redeploy can silently pick up an unpatched or breaking MinIO version. **Why:** `04-containers-and-images.md §base-image-pinning`. **Fix:** Pin to a specific release tag (e.g., `minio/minio:RELEASE.2025-06-13T11-33-47Z`) and update deliberately.

- 🟡 `docker-compose.yml` — No resource limits (`mem_limit`, `pids_limit`, `cpus`) on either service; a runaway query or upload can exhaust all host memory. **Why:** `04-containers-and-images.md §hardening-niceties`. **Fix:** Add `deploy.resources.limits` (compose v3) or `mem_limit` / `pids_limit` on each service.

- 🔵 `docker-compose.yml: image: postgres:16-alpine` — Pinned to major version but not to a digest or full patch tag; patch releases can change on pull. **Why:** `04-containers-and-images.md §base-image-pinning`. **Fix:** Pin to `postgres:16.x-alpine` with the specific patch, or add `--pull=never` to CI to prevent uncontrolled pulls.

- 🔵 `docker-compose.yml` — No `healthcheck:` directives on postgres or minio; compose marks services healthy immediately, so the API can receive connections before the DB is ready. **Why:** `04-containers-and-images.md §hardening-niceties`. **Fix:** Add standard Postgres and MinIO healthchecks + `depends_on: { condition: service_healthy }`.

- ✅ No Dockerfiles for application services — API and web are not containerised in the repo; no risk of secrets baked into image layers or missing `.dockerignore`. (When Dockerfiles are added, add `.dockerignore` that excludes `.env`, `.git`, `node_modules`.)

---

## Secrets in env & CI — WARN

- 🟡 `docker-compose.yml: POSTGRES_PASSWORD: school` / `MINIO_ROOT_USER: minioadmin` / `MINIO_ROOT_PASSWORD: minioadmin` — Weak, default credentials in a committed compose file. These values match the `.env.example`. If this compose file is used in any environment reachable from the network (not just dev localhost), the DB and object store are trivially compromised. **Why:** `05-secrets-and-ci.md §secrets-in-compose`. **Fix:** For dev: acceptable with the localhost-binding fix above. For prod: do not use compose at all, or override via an untracked env file and use strong credentials.

- 🟡 `apps/api/.env.example: DATABASE_URL=postgresql://school:school@localhost:5433/school_gradebook` — Example file uses identical credentials to the real dev `.env`, not placeholders. A new developer copying `.env.example` gets working real credentials; unclear which is the canonical source of truth. **Why:** `05-secrets-and-ci.md §committed-env-files`. **Fix:** Use obvious placeholders: `DB_USER=<your-db-user>`, `DB_PASS=<generate-with-openssl-rand-hex-16>`.

- 🟡 `apps/web/.env.local` — Committed to git (tracked by `git ls-files`). Current content (`NEXT_PUBLIC_API_URL=/api-proxy`) is not a secret, but `.env.local` is a developer override file; if a real secret is ever added (e.g., `NEXT_PUBLIC_SENTRY_DSN`), it will be committed. **Why:** `05-secrets-and-ci.md §committed-env-files`. **Fix:** Add `.env.local` to `.gitignore` and remove the current tracked file (`git rm --cached apps/web/.env.local`); document the required env vars in `.env.example` instead.

- ✅ `apps/api/.env` — Not git-tracked (root `.gitignore` covers `.env`); live Resend API key and other secrets not in the repo.

- ✅ No CI/CD pipeline files found — no GitHub Actions workflows, no GitLab CI, no Circle CI; no pipeline secrets to audit. (When CI is added, use `secrets.X` references, never hardcode tokens.)

- 🔵 No secret-scanning step in CI — no trufflehog / gitleaks configured. **Why:** `05-secrets-and-ci.md §CI-CD-pipeline`. **Fix:** When CI is set up, add a pre-merge secret-scan step.

---

## Low-confidence / needs human review

- ❔ `docker-compose.yml: postgres + minio` on 0.0.0.0 — whether these ports are actually internet-reachable depends on whether a firewall/security-group is configured at the hosting level. Config-level finding; confirm with `runtime-verify` or infra-ops.

- ❔ TLS termination — no proxy/nginx config in repo; assumed to be handled by a cloud load balancer or separate infra. Confirmed only by inspecting the production environment.

---

## Coverage gaps & follow-ups

This report audits **config files only**. Not covered:
- **App-code vulns** (IDOR, injection, authz) → already audited in `SOFTWARE-SECURITY-FINDINGS.md`.
- **Coding-agent config** → `/agent-harden-audit`.
- **Live reachability** (are ports actually open on the production host right now?) → `runtime-verify`.
- **Cloud IAM / VPC / firewall rules / security groups** → infra-ops, out of scope.
- **Next.js frontend XSS / client-side auth** → not audited here; recommend `/secure-audit` for `apps/web`.

**Blind spots within this audit:**
- No Kubernetes/Helm charts present — not applicable.
- No `docker-compose.override.yml` found.
- Production environment topology unknown — assumed cloud-hosted with a separate LB/WAF.

---

## Method

- Auditor: manual read + reference checks (infra-security-review/references/01–05)
- Files examined: `docker-compose.yml`, `apps/api/src/main.ts`, `apps/web/next.config.ts`, all `.env*` files, `.gitignore`, `pnpm-workspace.yaml`
- Git history checked for committed secrets (none found in current working tree)
- Port-map: no `PORT_MAP.md` present; inferred from compose + CLAUDE/services.md
