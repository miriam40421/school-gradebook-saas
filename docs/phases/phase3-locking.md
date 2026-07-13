# Phase 3 — Collaboration & Locking

**מטרה עסקית:** מספר מורים עורכים בו-זמנית בבטחה — נעילות רכות עם TTL.

**מבחן הצלחה:** מורה A נועל עמודה → מורה B רואה נעילה ולא יכול לשמור אותו scope → A משחרר או TTL פג → B יכול לערוך.

**סטטוס:** בוצע ✅

---

## מה נבנה

### Backend
- `EditLock` model: scope = `classId + subjectId + termId + classGroupId`, TTL 15 דקות
- `POST /locks/acquire` — רכישת נעילה
- `POST /locks/release` — שחרור נעילה
- `POST /locks/heartbeat` — הארכת TTL (כל 60 שניות)
- `GET /locks?classId=&termId=` — רשימת נעילות פעילות
- Logout מוחק אוטומטית את כל הנעילות של המשתמש
- `POST /gradebook/bulk-update` בודק נעילה לפני שמירה

### Frontend (בתוך GradebookGrid)
- `ensureLock()` — רוכש נעילה לפני עריכת תא
- Heartbeat כל 60s בזמן עריכה
- `beforeunload` → release lock
- הצגת מי מחזיק נעילה על כל עמודה
- אם נעילה פגה (409) → שחרור + הודעת שגיאה

---

## קבצים טכניים
- `04-models.md` — EditLock
- `06-services.md` — LocksService
- `07-controllers.md` — /locks endpoints
- `08-frontend.md` — lock logic ב-GradebookGrid
