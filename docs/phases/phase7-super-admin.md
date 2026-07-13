# Phase 7 — Super-Admin Portal

## סקופ
ממשק פלטפורמה נפרד לניהול בתי ספר (tenants). גישה רק ל-`role=super_admin`.

---

## Phase 7.1 — יסודות (2026-07-13)

### Backend
- `Role.SuperAdmin = 'super_admin'` ב-shared package
- `User.schoolId` nullable (migration: `add_super_admin_nullable_school`)
- `POST /auth/platform/login` — email+password בלבד (ללא schoolId)
- `GET /super-admin/schools` — רשימת בתי ספר
- `POST /super-admin/schools` — יצירת בית ספר + admin ראשון (transaction)
- `SuperAdminOnly()` decorator

### Frontend
- `/super-admin/login` + `/super-admin` pages
- Login page: toggle super-admin (מסתיר שדה schoolId)
- AppShell: `superAdminNav` + כותרת "ניהול פלטפורמה"
- `auth.tsx`: redirect `super_admin` → `/super-admin`

### Seed
- `superadmin@platform.local` / `SuperAdmin1!`

---

## Phase 7.2 — Email + Edit + Forgot Password (2026-07-14)

### Email Service (Resend)
- `EmailService` — `apps/api/src/super-admin/email.service.ts`
- 3 methods: `sendSchoolWelcome`, `sendSchoolUpdate`, `sendPasswordReset`
- `EMAIL_OVERRIDE` env → מפנה כל מיילים לכתובת מפתח בסביבת dev
- `RESEND_API_KEY` חסר → fallback ל-console.log
- Sender: `onboarding@resend.dev` (Resend shared domain, ללא domain מותאם אישית)

### עריכת בית ספר
- `GET /super-admin/schools/:id` → school + admin ראשון
- `PATCH /super-admin/schools/:id` — UpdateSchoolDto (כל שדה optional)
- מייל עדכון נשלח כשמשתנה: **שם בית ספר / אימייל מנהלת / סיסמה** (לא שם מנהלת בלבד)
- `/super-admin/schools/[id]` — דף עריכה עם dirty-check

### Forgot Password
- `PasswordResetToken` model (migration: `20260713172532_add_password_reset_tokens`)
  - token: 32 bytes hex random, unique
  - expiresAt: 2h, usedAt: nullable (single-use)
- `POST /auth/forgot-password` — תמיד מחזיר success (לא חושף אם משתמש קיים)
- `POST /auth/reset-password` — throttle 5/15min
- Reset URL: `APP_URL` env (set to `http://<server-ip>:3000`) + `x-app-url` header fallback
- Login page: eye icon + "שכחתי סיסמה" link (מעביר schoolId כ-query param)
- `/forgot-password` + `/reset-password` — public routes (Suspense wrapped)

### ENV vars נוספים (apps/api/.env)
```
APP_URL=http://192.168.1.176:3000
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev
EMAIL_OVERRIDE=malka.develop3949@gmail.com
```

---

## Invariants
- Super-admin אינו שייך לאף school → `schoolId = null`
- `@AdminOnly()` מחזיר 403 ל-super_admin (role לא מתאים — בכוונה)
- PasswordResetToken — immutable לאחר יצירה (אין UPDATE, רק `usedAt` נכתב פעם אחת)
- Reset token לא חושף אם email קיים במערכת

---

## קבצים מרכזיים
| קובץ | תפקיד |
|------|--------|
| `apps/api/src/super-admin/email.service.ts` | שליחת מיילים |
| `apps/api/src/super-admin/super-admin.service.ts` | createSchool, getSchool, updateSchool |
| `apps/api/src/super-admin/super-admin.controller.ts` | endpoints |
| `apps/api/src/auth/auth.service.ts` | forgotPassword, resetPassword, platformLogin |
| `apps/api/prisma/schema.prisma` | PasswordResetToken model |
| `apps/web/app/super-admin/` | רשימה + עריכה |
| `apps/web/app/forgot-password/` | טופס בקשת איפוס |
| `apps/web/app/reset-password/` | טופס סיסמה חדשה |
