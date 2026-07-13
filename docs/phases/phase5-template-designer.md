# Phase 5 — Certificate Template Designer

**מטרה עסקית:** Admin מעצב תבנית תעודה ויזואלית לבית הספר על קנבס A4, מקשר לפרופיל, מייצר PDF בתבנית מותאמת.

**מבחן הצלחה:** Admin יוצר תבנית landscape → מסדר blocks → תצוגה מקדימה RTL עם נתוני demo → מקשר לפרופיל → מייצר תעודת תלמיד בתבנית המותאמת.

**סטטוס:** בוצע ✅ — CLOSED 2026-06-17, Manager APPROVED, Architect APPROVED.

---

## מה נבנה

### Backend
- `CertificateTemplate` model: `layoutJson`, `layoutSchemaVersion`, `orientation`, `logoStorageKey`
- CRUD `/certificate-templates`
- `POST /certificate-templates/:id/logo` — upload לוגו
- `POST /certificate-templates/:id/background` — upload רקע
- `GET /certificate-templates/:id/asset` — שליפת asset
- `POST /certificate-templates/:id/preview` — preview PDF עם demo data
- `packages/certificate-layout` — renderer משותף ל-API ולפרונט

### עורך ויזואלי (Frontend)
- `/certificate-templates` — רשימת תבניות
- `/certificate-templates/[id]/edit` — עורך drag/drop על קנבס A4
- `react-rnd` — גרירה + שינוי גודל blocks
- סוגי blocks: לוגו, טקסט סטטי, שדות דינמיים (שם תלמיד/כיתה/תקופה), טבלת ציונים, היעדרויות, הערכה, חתימות, תאריך
- תמיכה מלאה ב-RTL עברית
- `NikudPicker` — בחירת ניקוד לשמות בתבנית

---

## קבצים טכניים
- `04-models.md` — CertificateTemplate
- `06-services.md` — CertificateTemplatesService
- `07-controllers.md` — /certificate-templates endpoints
- `08-frontend.md` — template designer pages + react-rnd
- `09-pdf.md` — שימוש ב-layout package לרנדור
