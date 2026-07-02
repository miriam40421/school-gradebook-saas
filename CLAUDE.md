# my_project — School Gradebook SaaS

מערכת SaaS לניהול ציונים ותעודות תלמידים.

---

## כללי קוד

- **שפה**: עברית לתגובות/הסברים, אנגלית לכל הקוד
- **Primary Keys**: תמיד UUID (`HasUuids` / `@default(uuid())`)
- **SoftDeletes**: על ישויות עסקיות (User, Student, Class, Subject, GradingSetType, GradingSet)
- **RTL**: כל ממשק משתמש עם `dir="rtl"` ו-`lang="he"`
- **school_id**: כל entity שייך לבית ספר חייב לכלול `schoolId` + FK constraint
- **Immutability**: אסור לשנות CertificateSnapshot לאחר יצירה

## Business Rules — לא לשבור

1. GradingTerm נעול (`isLocked=true`) → אסור לשנות grades. API מחזיר 403.
2. גרסה חדשה לתעודה → transaction: צור CertificateSnapshot חדש, ישן נשמר.
3. EditLock TTL = 15 דקות. Heartbeat כל 60 שניות.
4. CertificateSnapshot → immutable לאחר יצירה (אין UPDATE/DELETE).
5. GradeEntry unique: (schoolId, studentId, subjectId, termId).

---

## Docker — פקודות בסיס

```bash
# הפעל DB + MinIO
docker compose up -d

# נגיעה ב-API
cd apps/api && pnpm dev

# נגיעה ב-Web
cd apps/web && pnpm dev
```

## Detail Docs — קרא לפי צורך

| קובץ | מתי לקרוא |
|------|-----------|
| `CLAUDE/invariants.md` | לפני נגיעה בשטחים רגישים (grades, snapshots, auth) |
| `CLAUDE/git-workflow.md` | לפני commit / merge / parallel work |
| `CLAUDE/lessons-learned.md` | כשמשהו נשבר — בדוק אם כבר ראינו את זה |
| `CLAUDE/system-flows.md` | כשנוגעים ב-flows בין Web / API / DB / MinIO |
| `CLAUDE/services.md` | ports, containers, dev commands |
| `CLAUDE/db.md` | Prisma schema, connection strings |
| `CLAUDE/deploy.md` | build / release flow |

---

## תיעוד

קבצי phases מפורטים ב-`docs/phases/`.
כל שינוי שסוטה מהתכנון — עדכן את קובץ ה-phase הרלוונטי.

---

## Stack

- **Backend**: NestJS 10 + Prisma 6 + PostgreSQL 16
- **Frontend**: Next.js 14 + React 18 + Tailwind CSS 3.4
- **Auth**: JWT (Passport.js)
- **Storage**: MinIO (S3-compatible) / in-memory (dev)
- **PDF**: Playwright (Chromium)
- **Monorepo**: pnpm workspaces
- **Ports**: Web=3000, API=3001, PostgreSQL=5433, MinIO=9000/9001
