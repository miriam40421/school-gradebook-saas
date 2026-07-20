# דוח תאימות — חוק הגנת הפרטיות (תיקון 13) ותקנות אבטחת מידע 2017

**מערכת:** my_project — School Gradebook SaaS  
**Stack:** NestJS + Prisma + PostgreSQL + MinIO + Next.js  
**תאריך:** 2026-07-19  
**רמת אבטחה שנקבעה:** **בינונית (Medium)**  
**ממצאים:** 🔴 2 · 🟡 6 · 🔵 2

> ⚠️ **אזהרה משפטית:** מסמך זה הוא ניתוח תאימות טכני בלבד, ואינו ייעוץ משפטי. עמידה מלאה בדרישות החוק מחייבת גם תשתיות מאובטחות, תהליכים ארגוניים וייעוץ משפטי — ולא רק קוד.

---

## 1. סיווג מידע ורמת אבטחה

### טבלת שדות אישיים

| שדה | סיווג | מיקום | רגיש במיוחד? |
|-----|--------|--------|--------------|
| `users.name` | מזהה אישי | DB | לא |
| `users.email` | מזהה אישי | DB | לא |
| `users.password_hash` | אישורי גישה | DB | לא |
| `students.full_name` | מזהה אישי — קטין | DB | לא (אך קטין) |
| `grade_entries.value` | ביצועים אקדמיים | DB | לא |
| `certificate_supplements.evaluation` | הערכה התנהגותית | DB | ❔ תלוי תוכן |
| `certificate_supplements.absences/lateness` | נוכחות | DB | לא |
| `certificate_snapshots.snapshot_json` | ציונים מלאים | DB (JSONB) | לא |
| `certificate_snapshots.pdf_storage_key` | PDF תעודה | MinIO | לא |
| `audit_events.actor_id / target_id` | מזהי משתמש | DB | לא |

### נימוק רמת האבטחה — בינונית
מאגר נתונים של בית ספר עם ציונים, נוכחות, והערכות של **קטינים**. מאות תלמידים, מרובה-דיירים (multi-tenant). אין מידע רגיש במיוחד לפי תקנות 2017 (ללא בריאות/ביומטרי/מיקום GPS/שכר), אך:
- נתוני **קטינים** מחייבים רגישות מוגברת
- מספר מורשי הגישה > 10 (כל מורה ומנהל)
- מידע אקדמי ייתכן ויכלול הערכות התנהגות (`evaluation`)

רמה בינונית = הסף המינימלי. אם `evaluation` כולל אבחונים פסיכולוגיים/רפואיים → רמה **גבוהה**.

---

## 2. ממצאים לפי קטגוריה

---

### 🔴 בקרת גישה ולוגים (Reg 9, 10)

**🔴 [access-logging] `apps/api/src/auth/auth.service.ts` — אין MFA**  
**עוגן:** תקנה 9(ב)(2) — מאגר ברמה בינונית מחייב אימות דו-שלבי (MFA) לכל מורשה גישה.  
**בעיה:** המערכת משתמשת אך ורק בסיסמה (bcrypt + JWT). אין MFA לאף תפקיד — כולל Admin ו-HomeroomTeacher שיש להם גישה לכל נתוני התלמידים.  
**תיקון:** הוסף TOTP (Google Authenticator / OTP) כשלב שני חובה לפחות לתפקידי Admin ו-HomeroomTeacher. ספריה: `speakeasy` / `otplib`.

---

**🔴 [access-logging] `apps/api/src/common/audit.service.ts:19` + `prisma/schema.prisma:811` — לוג ביקורת חסר ניסיונות גישה שנדחו**  
**עוגן:** תקנה 10(א) — יש לרשום הן גישות מורשות הן ניסיונות גישה שנדחו, כולל: מי, מתי, לאיזה מידע, מה הפעולה, ומה התוצאה.  
**בעיה:** `AuditEvent` רושם פעולות מוצלחות בלבד. כשלי כניסה (`login_failure`) נרשמים דרך `Logger` של NestJS לקובץ log כללי — לא לטבלת `audit_events`. כמו כן, אין שדה `outcome` (הצלחה/דחייה) ב-`AuditEvent`. פירוש: אם מישהו מנסה לגשת לנתוני תלמיד שאינו שלו — הניסיון לא מתועד.  
**תיקון:** (א) הוסף שדה `outcome: 'success' | 'denied'` ל-`AuditEvent`. (ב) שלח כשלי כניסה + 403 לטבלת `audit_events`, לא רק ל-Logger.

---

### 🟡 בקרת גישה ולוגים — המשך

**🟡 [access-logging] `apps/api/src/common/data-retention.service.ts:17` — אין שמירת לוג ביקורת לפי תקנה 10**  
**עוגן:** תקנה 10(ג) — רשומות לוג גישה יישמרו לפחות 24 חודשים.  
**בעיה:** `DataRetentionService` מוחק `Student` ו-`User` לאחר 7 שנים, אך `AuditEvent` אינו מכוסה כלל — נשמר לנצח ללא מדיניות. זה כפול-כיוון: (א) לוגים צריכים minimum 24 חודשים, (ב) שמירתם לנצח היא עצמה בעיה כשהם מכילים מזהי משתמש.  
**תיקון:** הוסף ל-`DataRetentionService` מחיקה של `AuditEvent` שגילם מעל 36 חודשים (24 חובה + buffer).

**🟡 [access-logging] מגוון controllers — כיסוי חלקי של לוג ביקורת**  
**עוגן:** תקנה 10(א).  
**בעיה:** `students.service.ts` מפיק audit events לפעולות student CRUD. אך: כניסת משתמשים, יצירת תעודות, ייבוא תלמידים, עדכון תבניות — **לא** מפיקים `AuditEvent`. רק כניסה/יציאה נרשמות ב-Logger (לא ב-DB).  
**תיקון:** הפק `AuditEvent` ב-`AuthService.login()` + `certificates.service.ts` + `importMany()`.

---

### 🟡 זכויות נושא המידע (Sec 13, 14–15א)

**🟡 [data-subject-rights] `apps/api/src/storage` — קבצי PDF לא נמחקים עם מחיקת תלמיד**  
**עוגן:** סעיף 14 + 15א — הזכות למחיקה חלה על כלל המידע, כולל עותקים נגזרים.  
**בעיה:** `students.service.ts:244` עושה soft-delete. `DataRetentionService:19` עושה `deleteMany` ב-DB לאחר 7 שנים — cascade מוחק `CertificateSnapshot` מהDB. **אך** קובץ ה-PDF ב-MinIO (`pdfStorageKey`) לא נמחק. קבצי PDF של תעודות תלמידים נשארים ב-storage לנצח, גם לאחר מחיקת התלמיד מהמערכת.  
**תיקון:** ב-`DataRetentionService.purgeExpiredRecords()` — לפני מחיקת Student, שלוף את כל `pdfStorageKey` של snapshots שלו ומחק מ-MinIO. אחר כך מחק מה-DB.

**🟡 [data-subject-rights] אין endpoint לייצוא נתוני נושא מידע**  
**עוגן:** סעיף 13 לחוק — זכות עיון: נושא מידע זכאי לקבל עותק של המידע הרשום עליו.  
**בעיה:** אין API endpoint שמחזיר את כל המידע על תלמיד ספציפי (ציונים + נוכחות + הערכות + תעודות). הורה/תלמיד שיבקש "כל המידע עלי" — אין מנגנון.  
**תיקון:** הוסף endpoint (Admin בלבד לפי בקשה): `GET /students/:id/export` שמחזיר JSON מלא של כל הנתונים כולל grade_entries, certificate_supplements, snapshots.

---

### 🟡 הסכמה ומינימיזציה (Sec 8, 11; Reg 2)

**🟡 [consent-minimization] אין בסיס משפטי מתועד לעיבוד מידע קטינים**  
**עוגן:** סעיף 8(ב), 11 — עיבוד מידע אישי מחייב אחד מבסיסי ההיתר (הסכמה / חובה חוקית / חוזה).  
**בעיה:** המערכת מעבדת מידע של קטינים (שמות, ציונים, הערכות, נוכחות) ללא כל תיעוד בסיס משפטי בקוד או בDTOs. אין Privacy Policy, אין DPA (Data Processing Agreement) מול בתי הספר מוזכר, אין consent flow.  
**תיקון:** (א) DPA חתום עם כל בית ספר (ארגוני, לא קוד). (ב) הוסף לטבלת `schools` שדה `dpaSignedAt DateTime?` כהוכחת הסכם.

---

### 🔵 ממצאים קלים

**🔵 [access-logging] `apps/api/src/students/students.service.ts:161` — return query ללא schoolId**  
**עוגן:** תקנה 8 — בקרת גישה תקינה.  
**בעיה:** `updateGroupMemberships()` מאמת שהתלמיד שייך לschool (שורה 133), אבל query ה-return (שורה 161) מחזיר `findFirst({ where: { id: studentId } })` ללא `schoolId`. אם בעתיד יתווסף לוגיקה עסקית שמשתמשת בתוצאה הזו להחלטות גישה — זה יכול להיות IDOR. נוכחית: low risk.  
**תיקון:** הוסף `schoolId: user.school_id` ל-where בשורה 161.

**🔵 [consent-minimization] `apps/api/src/super-admin/email.service.ts:67` — email בלוג בסביבת dev**  
**עוגן:** Reg 10 — PII לא יירשם בלוגים שאינם מאובטחים.  
**בעיה:** כשאין `RESEND_API_KEY` (dev), `EmailService` רושם `To: ${recipient}` לNestJS Logger. בסביבת production עם RESEND_API_KEY — לא קורה. בסביבת staging ללא KEY — כתובות email נחשפות ב-logs.  
**תיקון:** הסר את ה-email מהלוג; רשום `[EMAIL DEV] email queued (recipient masked)` במקום.

---

## 3. תוכנית פעולה מתועדפת

| עדיפות | ממצא | מאמץ | עוגן |
|--------|------|-------|------|
| **High** | הוסף MFA לתפקידי Admin/Homeroom | גבוה | תקנה 9(ב)(2) |
| **High** | רשום ניסיונות גישה שנדחו ב-AuditEvent + שדה `outcome` | בינוני | תקנה 10(א) |
| **High** | מחק קבצי PDF מMinIO בזמן purge תלמידים | בינוני | סעיף 14 |
| **Medium** | הוסף retention policy ל-AuditEvent (36 חודשים) | נמוך | תקנה 10(ג) |
| **Medium** | הרחב audit coverage: login, certificates, import | בינוני | תקנה 10(א) |
| **Medium** | הוסף endpoint ייצוא נתוני תלמיד | בינוני | סעיף 13 |
| **Medium** | תעד DPA + הוסף `dpaSignedAt` לschools | ארגוני | סעיף 8(ב) |
| **Low** | הוסף schoolId לreturn query ב-updateGroupMemberships | נמוך | תקנה 8 |
| **Low** | הסר email מלוג ב-EmailService dev mode | נמוך | תקנה 10 |

---

## 4. פערי כיסוי — מה הבדיקה לא כיסתה

- **תשתית TLS**: האם החיבור ל-PostgreSQL ול-MinIO מוצפן בTLS — לא ניתן לאמת מקוד. בדוק `DATABASE_URL` ו-`STORAGE_ENDPOINT` ב-.env (Reg 14).
- **הפרדת רשתות**: האם PostgreSQL ו-MinIO נמצאים בsegment רשת נפרד — ארגוני/אינפרא (Reg 13).
- **שדה `evaluation`**: תוכן שדה ההערכה ב-`certificate_supplements` לא נבדק — אם מכיל אבחונים פסיכולוגיים → רמת אבטחה **גבוהה** (Reg 12).
- **Frontend**: לא נסרק `apps/web` — עלול להיות דליפת מידע ב-client-side.
- **DPA מול Resend**: שירות אימייל חיצוני מקבל `email` של מנהל בית ספר — האם יש DPA חתום עם Resend?

---

*ניתוח טכני בלבד — אינו ייעוץ משפטי. נדרש בנוסף: תשתיות מאובטחות, תהליכים ארגוניים, ייעוץ עו"ד מומחה.*
