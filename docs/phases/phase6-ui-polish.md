# Phase 6 — Application UI/UX Polish

**מטרה עסקית:** עיצוב ויזואלי אחיד ו-UX משופר על כל האפליקציה תוך שמירה על פונקציונליות פאזות 1-5.

**מבחן הצלחה:** כל הזרימות (Admin setup, gradebook, certificates, template designer) עובדות עם עיצוב אחיד, RTL תקין, ניווט ברור.

**סטטוס:** בוצע ✅ — CLOSED 2026-06-17, Manager APPROVED, Architect APPROVED.

---

## מה נבנה

### Design System
- CSS variables (design tokens): צבעים, spacing, shadows, typography
- Aurora Gradient + Glassmorphism aesthetic
- Font: Noto Sans Hebrew (Google Fonts)
- RTL: `dir="rtl"` + `lang="he"` על כל `<html>`
- ראה `docs/ui-ux-spec.md` למפרט מלא

### Component Library
- `Button`, `Input`, `Select`, `Textarea`
- `Card`, `Alert`, `Badge`, `Label`
- `DataTable`, `PageHeader`, `EmptyState`
- `Checkbox`, `ToggleSwitch`, `Spinner`, `Skeleton`, `Toast`

### Shell & Navigation
- `AppShell` — Admin layout עם sidebar
- `TeacherShell` — Teacher layout (homeroom vs subject variants)
- Responsive breakpoints: 375px, 768px, 1024px, 1440px

### Screens שקיבלו polish
- Admin: dashboard, school setup, grading sets, subjects, classes, users, students
- Teacher: gradebook (כולל lock visualizations), certificates, my-students
- Certificate template designer chrome
- Help/onboarding: `/help`, `/help/teacher`, `/help/homeroom`

---

## קבצים טכניים
- `08-frontend.md` — כל הדפים והקומפוננטים
- `docs/ui-ux-spec.md` — מפרט עיצוב מפורט (נוצר לפני קוד)
- `apps/web/app/globals.css` — CSS variables
- `apps/web/tailwind.config.ts` — Tailwind config
