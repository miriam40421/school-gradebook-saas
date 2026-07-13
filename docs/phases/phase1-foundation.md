# Phase 1 — Foundation & School Setup

**מטרה עסקית:** Admin מחובר יכול להגדיר מבנה בית ספר מלא עם בידוד multi-tenant.

**מבחן הצלחה:** Admin login → יוצר grading set + subject + כיתה + תלמידים + משתמשים → נתונים נשמרים ומבודדים לפי `schoolId`.

**סטטוס:** בוצע ✅

---

## מה נבנה

### תשתית
- Docker Compose: PostgreSQL 16 (port 5433) + MinIO (ports 9000/9001) — ראה `01-docker.md`
- Monorepo: `apps/api`, `apps/web`, `packages/shared`, `packages/certificate-layout` — ראה `02-monorepo.md`
- Prisma schema + 21 מיגרציות — ראה `03-migrations.md`
- כל המודלים הבסיסיים — ראה `04-models.md`

### Auth & RBAC
- JWT (HS256, 24h) + token revocation (RevokedToken)
- Login דורש `schoolId` לבידוד multi-tenant
- 3 תפקידים: Admin, HomeroomTeacher, SubjectTeacher
- ראה `05-auth.md`

### הגדרת בית ספר (Admin בלבד)
- School settings (שם, settingsJson)
- Users CRUD
- Classes CRUD + ClassGroups (פיצול מקצוע לקבוצות)
- Students CRUD + bulk import מ-XLSX/CSV
- Subjects CRUD
- GradingSetTypes CRUD (היררכי עם parentId)
- GradingSets + GradingSetValues CRUD
- GradingTerms CRUD + lock/unlock
- TeacherAssignments — שיוך מורה לכיתה/מקצוע/קבוצה

### Frontend (Admin)
- `/login`, `/dashboard`, `/school`, `/grading-sets`, `/subjects`, `/classes`, `/users`, `/students`, `/help`

---

## קבצים טכניים
- `01-docker.md` — סביבה
- `02-monorepo.md` — מבנה פרויקט
- `03-migrations.md` — היסטוריית DB
- `04-models.md` — כל המודלים
- `05-auth.md` — auth + roles
- `06-services.md` — services רלוונטיים: Auth, School, Users, Classes, Students, Subjects, GradingSets, GradingTerms, TeacherAssignments
- `07-controllers.md` — endpoints: /auth, /school, /users, /classes, /students, /subjects, /grading-set-types, /grading-sets, /grading-terms, /teacher-assignments
- `08-frontend.md` — דפי Admin setup
