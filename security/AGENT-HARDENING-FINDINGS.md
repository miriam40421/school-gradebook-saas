# Agent Hardening Findings — my_project — 2026-07-15

> Read-only audit of this repo's coding-agent configuration (`.claude/`) against the 8 hardening
> layers defined in `agent-hardening-review/references/06-agent-hardening.md`.
> No config files were created or modified — gaps are reported, not auto-fixed.
> Scope: `/home/runner/my_project` + global `/home/runner/.claude/`.

---

## STATUS UPDATE — 2026-07-19

### ✅ Fixed in session 2026-07-18/19
| Layer | Finding | Fix |
|-------|---------|-----|
| Layer 7 | GitHub PAT hardcoded in `settings.json` | Token rotated; moved to `${GITHUB_PAT}` env var; `~/.bashrc` exports `GITHUB_PAT` |
| Layer 5 | `security-reviewer` had `Bash` in tools | Removed `Bash` → `tools: Read, Grep, Glob` only |

### ⏭️ Pending — to be done LAST (after all other work)
| Layer | Finding | Reason deferred |
|-------|---------|-----------------|
| Layer 3 | PreToolUse hook blocking `.env` reads | Must be last — adding it now would block file edits during remaining work |
| Layer 2 | `permissions.deny` for secret file patterns | Same reason; do together with Layer 3 |

### 🔴 Still open
| Layer | Finding | Priority |
|-------|---------|----------|
| Layer 3 | No PreToolUse hook inspecting `file_path` for `.env`/`secrets`/`.ssh` | 🔴 critical — the one reliable enforcing gate |
| Layer 2 | No `permissions.deny` block in `settings.json` | 🟡 secondary to Layer 3 |
| Layer 4 | No sandbox / dev-container | 🟡 medium |
| Layer 6 | No CI security-review Action | 🟡 deferred until CI set up |
| Layer 8 | No trufflehog/gitleaks pre-commit scan | 🟡 deferred until CI set up |

---

---

## Summary

| | Layer | Status | Severity if missing |
|---|---|---|---|
| 1 | CLAUDE.md security rules | PRESENT (weak) | 🟡 |
| 2 | permissions.deny on secrets | MISSING | 🟡 |
| 3 | PreToolUse block-secrets hook (`exit 2`) | MISSING | 🔴 |
| 4 | Sandbox / dev-container | MISSING | 🟡 |
| 5 | Read-only reviewer subagent | PRESENT (mis-wired) | 🟡 |
| 6 | CI security-review Action | MISSING | 🟡 |
| 7 | MCP trust segregation | FAIL — hardcoded PAT | 🔴 |
| 8 | Secrets out of agent-visible files + CI secret-scan | MISSING | 🔴 |

**Enforcing layers present: 0 / 4** (layers 3, 4, 5, 6 are the ones that actually block).

**Headline:** GitHub PAT hardcoded in plaintext in `~/.claude/settings.json` (Layer 7/8 🔴); no PreToolUse hook blocks secret-file reads; live `.env` with API keys sits in the agent-visible working tree with zero enforcing guards.

---

## Layer 1 — CLAUDE.md security rules *(behavioral)*

**Status:** PRESENT (weak) — `/home/runner/my_project/CLAUDE.md`

Project `CLAUDE.md` exists and contains business-rule constraints (immutable snapshots, GradingTerm lock, multi-tenant FK requirements). However it has **no explicit security section** covering:
- "Do not read/edit `.env`, `secrets/`, `~/.aws`, `~/.ssh`"
- "Use parameterized queries only (no raw SQL concatenation)"
- "Never log secrets or tokens"

The global `~/.claude/CLAUDE.md` has a comprehensive security + project guide (Golden Rules, branch discipline) which is loaded in all sessions — partial behavioral coverage.

**Risk:** behavioral only; a CLAUDE.md instruction is a reminder, not a wall.
**Recommends:** add an explicit `## Security` section to `/home/runner/my_project/CLAUDE.md` covering secret-file access, injection patterns, and the "never commit plaintext secrets" rule.

---

## Layer 2 — permissions.deny on secrets *(behavioral, enforcement-bug caveat)*

**Status:** MISSING — neither `~/.claude/settings.json` nor `~/.claude/settings.local.json` contains a `permissions.deny` block.

`settings.local.json` has `permissions.allow` rules only. No project-level `.claude/settings.json` exists. Secret file patterns (`.env`, `secrets/**`, `~/.aws/**`, `~/.ssh/**`) are entirely uncovered at the permissions layer.

**Caveat:** even if added, `deny` rules have known enforcement gaps (issues #6699, #6631, #8961, #24846) — must be backed by the Layer-3 hook.
**Recommends:** add to `~/.claude/settings.json → permissions.deny`: `["Read(./.env)","Read(./.env.*)","Read(./secrets/**)","Read(~/.aws/**)","Read(~/.ssh/**)"]`.

---

## Layer 3 — PreToolUse block-secrets hook 🔒 *(enforcing — the one to rely on)*

**Status:** MISSING

Two PreToolUse hooks exist for the `Bash` matcher:
1. **Inline `rm` blocker** (`settings.json:62`) — uses `permissionDecision: "deny"` JSON output; correctly blocks `rm` commands.
2. **`block-destructive-docker.sh`** (`settings.json:67`) — uses `exit 2` ✅; blocks destructive `docker volume` operations.

A third PreToolUse hook (`winmux claude-hook pre-tool-use`) fires on `Bash|Write|Edit|MultiEdit|NotebookEdit|Task` — unknown internal purpose (UI/notification layer).

**None of these hooks inspect `file_path` or `path` for `.env`, `secrets/`, `~/.aws`, `~/.ssh` patterns. Read/Write/Edit of sensitive files is entirely unblocked.**

The existing hooks correctly use `exit 2` for the cases they do cover — the pattern is right; the secret-file case is simply absent.

**Risk:** 🔴 the one reliable enforcement gate is absent; agent can read `apps/api/.env` (live Resend API key), `~/.aws/credentials`, `~/.ssh/id_*` etc. without any blocker.
**Recommends:** add a PreToolUse hook (matcher: `Read,Write,Edit,MultiEdit`) that reads `.tool_input.file_path // .tool_input.path // empty` and exits 2 if the path matches `\.env|/secrets/|/\.aws/|/\.ssh/|\.pem$|\.key$`. Must use `exit 2` (not `exit 1`).

---

## Layer 4 — Sandbox / dev-container *(enforcing, Bash-only)*

**Status:** MISSING

`~/.claude/settings.json:137` has `"skipDangerousModePermissionPrompt": true` — this suppresses the dangerous-mode confirmation prompt but does **not** enable sandbox isolation. No `sandbox: true` flag, no bubblewrap config, and no dev-container (`devcontainer.json`) is defined.

**Caveat:** sandbox applies to Bash children only; Read/Edit/Write run outside it regardless.
**Risk:** 🟡 agent can execute arbitrary shell commands with network access; no OS-level containment.
**Recommends:** enable sandbox in settings; for autonomous work, run Claude Code inside a dev-container that mounts only the project workdir and runs as non-root with outbound network on an allowlist.

---

## Layer 5 — Read-only reviewer subagent *(enforcing via narrow tools)*

**Status:** PRESENT but mis-wired — `/home/runner/.claude/agents/security-reviewer.md:4`

Subagent `security-reviewer` exists and is labeled "read-only / flag don't fix". Its `tools` line:
```
tools: Read, Grep, Glob, Bash
```
`Bash` is included. A tool-restricted subagent's enforcement comes from its narrow `tools` list — adding `Bash` gives it full shell execution capability (file writes, network calls, arbitrary commands). If the parent session runs in `bypassPermissions`, this subagent inherits that and can do anything.

**Fix:** remove `Bash` from the tools list → `tools: Read, Grep, Glob`. If `Bash` is needed for `git diff` or `grep -r`, it can be added back with the understanding that it weakens the isolation guarantee.
**Risk:** 🟡 the subagent is nominally read-only but has the tools to be destructive.

---

## Layer 6 — CI security-review Action *(enforcing-ish)*

**Status:** MISSING

No `.github/workflows/` directory anywhere in the repo. No `anthropics/claude-code-security-review` Action or any other CI secret-scan pipeline (trufflehog, gitleaks, git-secrets) is configured.

**Risk:** 🟡 no automated security review runs on every PR; committed secrets and code vulns have no automated backstop.
**Recommends:** when CI is set up, add the `anthropics/claude-code-security-review` Action; require "Approve for external contributors" approval (the Action is not hardened against prompt injection); add trufflehog or gitleaks as a pre-merge step.

---

## Layer 7 — MCP trust boundaries

**Status:** FAIL — 🔴 GitHub PAT hardcoded in plaintext in `~/.claude/settings.json:10`

One MCP server is configured: `@modelcontextprotocol/server-github` (read+write — can create PRs, push code, open/close issues). The `GITHUB_PERSONAL_ACCESS_TOKEN` is stored as a **plaintext string value** inside `settings.json`.

`settings.json` is a file the agent can read. **The PAT is directly visible to the agent** and could be included in transcripts or logs. If `settings.json` is ever committed (currently git-tracked? — the root `.gitignore` only covers `my_project/.env`, not `~/.claude/`), the token would be in git history permanently.

No read-only MCP server exists to segregate read vs write trust. No sensitive-tool approval gating.

**Risk:** 🔴 hardcoded live credential in agent-visible config; MCP tools unrestrained.
**Recommends:**
1. **Rotate the GitHub PAT immediately** — assume it has been seen by the agent and may be in transcripts.
2. Move the token out of `settings.json` to a shell-exported env var: `"env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PAT}" }` and set `GITHUB_PAT` in `~/.bashrc` or `~/.zshrc`.
3. Use a minimal-scope PAT (repo-scoped, no admin/write:packages).

---

## Layer 8 — Secrets handling

**Status:** MISSING — 🔴

Three issues:

1. **`apps/api/.env` is agent-visible** — contains live Resend API key (`RESEND_API_KEY`), internal IP in `APP_URL`, and other config. The `.gitignore` at `my_project/.gitignore:2` lists `.env` (protecting the git log), but `.gitignore` is **not respected by the agent** — the agent reads files independently of git. No Layer-2 deny and no Layer-3 hook blocks this read.

2. **GitHub PAT in `~/.claude/settings.json`** — same as Layer 7; this is the most immediately actionable credential at risk.

3. **No CI secret-scan** — no trufflehog, gitleaks, or `git-secrets` configured anywhere in the repo or pipeline.

**Recommends:**
- Add the Layer-3 hook (see Layer 3 above) as the primary guard.
- Add `permissions.deny` for `.env` patterns as a secondary layer.
- Move secrets from `.env` files into a vault (HashiCorp Vault, AWS Secrets Manager) or at minimum OS-level env vars injected at container start.
- Add trufflehog/gitleaks as a pre-commit hook and CI step.

---

## Method

- Auditor (read-only): `agent-config-auditor` + manual spot-check of hook source (`block-destructive-docker.sh:17` confirmed `exit 2`; `security-reviewer.md:4` confirmed `Bash` in tools).
- Files examined: `~/.claude/settings.json`, `~/.claude/settings.local.json`, `~/.claude/hooks/block-destructive-docker.sh`, `~/.claude/agents/security-reviewer.md`, `/home/runner/my_project/CLAUDE.md`.
- Baseline: `agent-hardening-review/references/06-agent-hardening.md` (8 layers).
- No `.claude/` file was created or modified.
