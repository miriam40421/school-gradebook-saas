# Phase 2 — Gradebook Core

**מטרה עסקית:** מורה בוחר כיתה + תקופה → מכניס ציונים בגריד Excel-like → שמירה אוטומטית.

**מבחן הצלחה:** Admin/מורה login → בחירת כיתה + תקופה → עריכת ציונים בגריד → debounced bulk save → רענון מראה ערכים שמורים; מורה מקצוע חסום על עמודות לא משויכות.

**סטטוס:** בוצע ✅

---

## מה נבנה

### Backend
- `GradeEntry` model: UNIQUE(schoolId, studentId, subjectId, termId)
- `GET /gradebook?classId=&termId=` — מחזיר מטריצת ציונים מלאה
- `POST /gradebook/bulk-update` — שמירת תאים מרובים בבת אחת
- RBAC: Admin רואה הכל, HomeroomTeacher רואה כיתה שלו, SubjectTeacher רואה מקצועות משויכים בלבד
- Label resolution — ממיר value למבנה label מלא כולל grading set

### Frontend
- `GradebookGrid` — גריד מווירטואלי (TanStack Virtual) ל-100+ שורות
- Zustand store (`useGradebookStore`): dirty map, localEntries, undo/redo (50 פעולות)
- Debounced autosave: 500ms אחרי שינוי → `POST /gradebook/bulk-update`
- Keyboard nav: Tab, Enter, חצים
- Copy/paste בין תאים (Ctrl+C/V)
- Drag-fill (fill-down handle)
- Dropdown label selection per cell

### דפים
- `/gradebook` — Admin (read-only)
- `/teacher/gradebook` — מורה (עריכה מלאה)

---

## קבצים טכניים
- `04-models.md` — GradeEntry
- `06-services.md` — GradebookService
- `07-controllers.md` — /gradebook endpoints
- `08-frontend.md` — GradebookGrid, Zustand store
