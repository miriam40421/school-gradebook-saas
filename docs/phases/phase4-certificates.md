# Phase 4 — Certificates & Snapshots

**מטרה עסקית:** יצירת תעודות PDF בלתי ניתנות לשינוי מנתוני תקופה נעולה.

**מבחן הצלחה:** נעילת תקופה → מחנך מייצר תעודות לכיתה → תצוגה מקדימה + הורדת PDF → עריכת ציונים חסומה בזמן נעילה.

**סטטוס:** בוצע ✅

---

## מה נבנה

### Backend
- `CertificateSnapshot` model: immutable אחרי יצירה (אין UPDATE/DELETE)
- `CertificateSupplement` model: היעדרויות, עיכובים, הערכה, חתימות, nikud overrides — UNIQUE(schoolId, studentId, termId)
- `POST /certificates/generate` — יצירת תעודה (יחיד/אצווה)
- `GET /certificates/snapshots` — רשימת snapshots
- `GET /certificates/snapshots/:id/pdf` — הורדת PDF מ-MinIO
- `GET /certificates/snapshots/:id/preview-html` — תצוגת HTML
- `GET /certificates/supplement-context` — נתוני supplement לכיתה/תקופה
- `PUT /certificates/supplements` — שמירת supplement data
- `PUT /certificates/label-overrides` — override ל-labels בתעודה
- `POST /certificates/nikud-text` — ניקוד אוטומטי לטקסט עברי
- `PATCH /grading-terms/:id/lock` / `unlock` — נעילת/פתיחת תקופה; term נעול → API מחזיר 403 על grade update

### PDF Pipeline
1. Fetch grades + supplement
2. Build `snapshotJson` (frozen state)
3. Render HTML via `@school/certificate-layout`
4. Playwright (Chromium headless) → PDF
5. Store in MinIO via `StorageAdapter`
6. Save `pdfStorageKey` on snapshot

### Frontend
- `/teacher/certificates` — יצירה + הורדה
- `/my-students` — עריכת supplement data (מחנך)
- `CertificatePdfPreview`, `CertificateUnifiedTable`, `CertificateSetupBanner`

---

## קבצים טכניים
- `04-models.md` — CertificateSnapshot, CertificateSupplement
- `06-services.md` — CertificatesService, PdfRenderService, StorageAdapter
- `07-controllers.md` — /certificates endpoints
- `08-frontend.md` — certificate pages + components
- `09-pdf.md` — PDF pipeline פרטי
