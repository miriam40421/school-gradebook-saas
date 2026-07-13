# student-certificates-saas — MASTER PLAN v2

---

## SYSTEM GOAL

A multi-tenant SaaS platform for schools to manage student grades and generate official PDF report cards.

### Core capabilities
- Excel-like gradebook interface  
- Fully configurable grading labels per school  
- Role-based access control (RBAC)  
- Parallel editing by multiple teachers  
- PDF report card generation  
- Versioned snapshots (immutable certificates)  

---

## CORE ARCHITECTURAL PRINCIPLE

### Fully Custom Label-Based Grading System

Each school defines:
- Grading Sets (categories)
- Labels (values per set)

**Examples:**
- Academic: Excellent, Very Good, Good, Satisfactory  
- Behavior: Outstanding, Adequate, Needs Improvement  

No fixed grading scale exists.

---

## SYSTEM ARCHITECTURE

### Frontend
- Next.js
- Virtualized grid (TanStack Virtual)
- React Query
- Zustand

### Backend
- Node.js + NestJS
- REST API
- Rate limiting: ThrottlerModule (300 req/60s global; 30 req/15min on login)

### Database
- PostgreSQL

### Storage
- S3 compatible (MinIO in dev/staging)

### PDF Engine
- HTML to PDF (Playwright / Chromium)

### Monorepo Packages
- `packages/shared` — shared types and roles
- `packages/certificate-layout` — layout renderer shared between API (PDF) and frontend (preview)

---

## SYSTEM PRINCIPLES

### Multi-tenancy
- `school_id` in every table  
- strict isolation between schools  

### Gradebook model
- rows = students  
- columns = subjects  
- cells = label string  

---

## DATA MODEL

- `schools(id, name, settings_json)`
- `users(id, school_id, role, name, email, password_hash)` — soft delete
- `classes(id, school_id, name, year, year_hebrew, homeroom_teacher_id, certificate_profile_id)` — soft delete
- `class_groups(id, school_id, class_id, subject_id, name, sort_order)` — subject sub-groups within a class
- `students(id, school_id, class_id, full_name)` — soft delete
- `student_class_groups(id, school_id, student_id, class_group_id)` — junction: student ↔ group
- `subjects(id, school_id, grading_set_type_id, name)` — soft delete
- `grading_set_types(id, school_id, key, label, parent_id)` — hierarchical categories (self-join); soft delete
- `grading_sets(id, school_id, grading_set_type_id, name)` — soft delete
- `grading_set_values(id, grading_set_id, label, order)`
- `grading_terms(id, school_id, name, is_locked)`
- `grade_entries(id, school_id, student_id, class_id, subject_id, term_id, teacher_id, value, version, updated_at)` — UNIQUE(school_id, student_id, subject_id, term_id)
- `user_subjects(user_id, subject_id)` — junction: teacher → subject
- `teacher_assignments(id, school_id, user_id, subject_id, class_id, class_group_id)` — teacher → class/subject/group mapping
- `locks(id, school_id, class_id, subject_id, term_id, class_group_id, locked_by, expires_at)` — TTL 15min
- `certificate_snapshots(id, school_id, student_id, class_id, term_id, snapshot_json, pdf_storage_key, generated_by, created_at)` — immutable after creation
- `certificate_supplements(id, school_id, student_id, class_id, term_id, absences, lateness, hour_absences, hour_lateness, evaluation, homeroom_signature, principal_signature, grade_comments, nikud_overrides)` — UNIQUE(school_id, student_id, term_id)
- `certificate_templates(id, school_id, name, orientation, layout_json, layout_schema_version, logo_storage_key)`
- `revoked_tokens(jti, expires_at, revoked_at)` — JWT revocation on logout

---

## GRADEBOOK UI

- Spreadsheet-like interface  
- Dropdown labels per cell  

---

## API

### Auth
- `POST /auth/login` — requires `{email, password, schoolId}` (multi-tenant)
- `POST /auth/logout` — revokes JWT
- `GET /auth/me`

### School & Users (Admin)
- `GET/PATCH /school`
- `CRUD /users`
- `CRUD /teacher-assignments`
- `GET /my/teacher-assignments` — subject teacher's own assignments

### School Configuration (Admin)
- `CRUD /classes`
- `CRUD /classes/:classId/groups` — class sub-groups
- `CRUD /students`
- `POST /students/import` — bulk import JSON
- `POST /students/import-file` — upload XLSX/CSV
- `PATCH /students/:id/group-memberships`
- `CRUD /subjects`
- `CRUD /grading-set-types`
- `CRUD /grading-sets`
- `CRUD /grading-sets/:id/values`
- `CRUD /grading-terms`
- `PATCH /grading-terms/:id/lock` / `unlock`

### Gradebook
- `GET /gradebook?classId=&termId=`
- `POST /gradebook/bulk-update`

### Locks
- `POST /locks/acquire`
- `POST /locks/release`
- `POST /locks/heartbeat`
- `GET /locks?classId=&termId=`

### Certificates
- `POST /certificates/generate`
- `GET /certificates/snapshots?classId=&termId=`
- `GET /certificates/snapshots/:id`
- `GET /certificates/snapshots/:id/pdf`
- `GET /certificates/snapshots/:id/preview-html`
- `GET /certificates/supplement-context?classId=&termId=`
- `PUT /certificates/supplements`
- `PUT /certificates/label-overrides`
- `POST /certificates/nikud-text`

### Certificate Templates (Admin)
- `CRUD /certificate-templates`
- `POST /certificate-templates/:id/logo`
- `POST /certificate-templates/:id/background`
- `GET /certificate-templates/:id/asset`
- `POST /certificate-templates/:id/preview`

---

## AUTHORIZATION

### Roles
- admin  
- homeroom_teacher  
- subject_teacher  

### Enforcement
- Backend mandatory
- Frontend UX only (no security reliance)

### Login
- `POST /auth/login` requires `schoolId` — enables multi-tenant isolation at login time
- JWT token revocation on logout via `revoked_tokens` table (stores `jti`)

---

## CONCURRENCY

### Soft lock strategy
- Key: `class_id + subject_id + term_id + class_group_id`
- TTL-based automatic release (15min)
- Heartbeat every 60s to extend TTL
- Logout automatically releases all locks held by user

---

## CERTIFICATE PIPELINE

1. Fetch grades  
2. Apply template  
3. Render HTML  
4. Convert to PDF  
5. Store snapshot  

---

## PERFORMANCE

- No per-cell API calls  
- Batch updates required  
- UI virtualization required  
- Debounced autosave  

---

## MVP SCOPE

### Included
- Authentication  
- School setup  
- Gradebook  
- RBAC  
- PDF generation  

### Not included
- AI features  
- Analytics  
- Parent portal  
- Plugins system  

---

## RISKS

- Variability → controlled label system  
- PDF complexity → deterministic snapshots  
- Performance → batching + virtualization  
- Concurrency → soft locks  

---

## SYSTEM DEFINITION

A multi-tenant SaaS platform for school report cards where each school defines its own grading language using configurable label-based evaluation systems.

---

## PHASED DELIVERY PLAN

Phases are ordered for functional testability. Details for the active phase are in `arch-phase<N>.md`.

### Phase 1: Foundation & School Setup

**Goal:** Authenticated admin can configure school structure (grading sets, subjects, classes, students, users) with tenant isolation.

**In scope:** Monorepo scaffold (`apps/web`, `apps/api`), PostgreSQL schema for setup entities, auth + RBAC (backend-enforced), admin UI for configuration.

**Out of scope:** Gradebook grid, grade APIs, soft locks, PDF/S3, certificate snapshots.

**Functional test:** Admin login → create grading set + subject + class + students + users → data persists and is isolated per `school_id`.

**Contract:** `team-Yuri/arch-phase1.md`

---

### Phase 2: Gradebook Core

**Goal:** Excel-like grade entry for a class/term with batch updates and debounced autosave.

**In scope:** `grade_entries`, `grading_terms`, gradebook API, virtualized grid, subject/homeroom RBAC for editing.

**Out of scope:** PDF generation, certificate snapshots, grading period lock enforcement, soft locks.

**Functional test:** Admin or teacher login → select class + term → edit label grades in grid → debounced bulk save → refresh shows persisted values; subject teacher blocked on unassigned columns.

**Contract:** `team-Yuri/arch-phase2.md`

---

### Phase 3: Collaboration & Locking

**Goal:** Multiple teachers edit safely with soft locks and TTL.

**In scope:** `locks` table, acquire/release/heartbeat API, gradebook lock indicators, bulk-update enforcement.

**Out of scope:** PDF/certificates, `grading_terms.is_locked` enforcement, WebSockets.

**Functional test:** Teacher A acquires column lock → Teacher B sees lock and cannot save same scope → A releases or TTL expires → B can edit.

**Contract:** `team-Yuri/arch-phase3.md`

---

### Phase 4: Certificates & Snapshots

**Goal:** Generate immutable PDF report cards from locked term data.

**In scope:** HTML→PDF pipeline, S3 storage, `certificate_snapshots`, preview and batch export, term lock enforcement, certificate profiles and prefs.

**Out of scope:** Visual template designer, custom per-school layouts.

**Functional test:** Lock term → homeroom generates class certificates → preview/download PDF → grade edits blocked while locked.

**Contract:** `team-Yuri/arch-phase4.md`

---

### Phase 5: Certificate Template Designer

**Goal:** Admin designs per-school certificate layouts on an A4 canvas (portrait or landscape), links templates to certificate profiles, previews with Hebrew demo data, and generates PDFs from saved layouts instead of fixed `default-rtl` only.

**In scope:** `certificate_templates` entity, block-based layout schema, admin visual editor (drag/position/size/colors/fonts/RTL), block types (logo, static text, dynamic fields, grades table, attendance, evaluation, signatures, date), profile `templateId` linkage, shared layout renderer for preview + PDF, Phase 4 pipeline unchanged externally.

**Out of scope:** Canva-class effects/animations/video, multi-page certificates (unless explicitly approved), InDesign export.

**Functional test:** Admin creates landscape template → arranges blocks → preview RTL demo PDF → links profile → generates student certificate using custom layout.

**Contract:** `team-Yuri/arch-phase5.md`

**Status:** CLOSED 2026-06-17 — Manager APPROVED, Architect APPROVED.

---

### Phase 6: Application UI / UX Polish

**Goal:** Unified visual design and improved UX across the web app (admin, homeroom, subject teacher flows) while preserving Phase 1–5 functionality.

**In scope (to be refined in `arch-phase6.md`):** design system (colors, typography, spacing), RTL layout polish, navigation/shell, key screens (school setup, gradebook, certificates, template designer chrome).

**Out of scope:** Canva-class certificate editor expansion, parent portal, new backend features unrelated to presentation.

**Contract:** `team-Yuri/arch-phase6.md`

**Status:** CLOSED 2026-06-17 — Manager APPROVED, Architect APPROVED.

---

### Post-MVP (not scheduled)

Parent portal, analytics, AI comments, mobile app, external integrations — per PRD out of scope.