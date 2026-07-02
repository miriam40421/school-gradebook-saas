# מפרט UI/UX — School Gradebook SaaS
**גרסה:** 1.0 | **תאריך:** 2026-06-23 | **מחייב:** כל בניית frontend

---

## 1. זהות עיצובית

**סגנון:** Aurora Gradient + Glassmorphism + Dimensional Layering  
**מצב:** Light mode only  
**שפה:** עברית RTL  
**פונט:** Noto Sans Hebrew  
**מה בלתי נשכח:** מסך ה-login עם aurora חי, sidebar זכוכיתי, gradebook ויזואלי עם lock badges צבעוניים

---

## 2. Design Tokens — CSS Variables

```css
:root {
  /* === Colors === */
  --color-primary:        #6366F1;  /* Indigo */
  --color-primary-hover:  #4F46E5;
  --color-primary-light:  #EEF2FF;  /* bg for active state */
  --color-secondary:      #818CF8;
  --color-cta:            #10B981;  /* Emerald — buttons, success */
  --color-cta-hover:      #059669;
  --color-warning:        #F59E0B;
  --color-warning-light:  #FFFBEB;
  --color-danger:         #DC2626;
  --color-danger-light:   #FEF2F2;
  --color-success:        #10B981;
  --color-success-light:  #ECFDF5;
  --color-info:           #3B82F6;
  --color-info-light:     #EFF6FF;

  /* === Backgrounds === */
  --color-background:     #F5F3FF;  /* Lavender canvas */
  --color-surface:        #FFFFFF;
  --color-surface-raised: #FAFAFA;
  --color-border:         rgba(99, 102, 241, 0.15);
  --color-border-strong:  rgba(99, 102, 241, 0.30);

  /* === Text === */
  --color-text:           #1E1B4B;  /* Dark indigo */
  --color-text-muted:     #475569;
  --color-text-subtle:    #94A3B8;
  --color-text-on-primary: #FFFFFF;

  /* === Aurora === */
  --aurora-1: #6366F1;
  --aurora-2: #818CF8;
  --aurora-3: #10B981;
  --aurora-opacity: 0.18;

  /* === Glass === */
  --glass-bg:             rgba(255, 255, 255, 0.82);
  --glass-bg-strong:      rgba(255, 255, 255, 0.95);
  --glass-blur:           16px;
  --glass-border:         1px solid rgba(255, 255, 255, 0.35);
  --glass-border-inner:   1px solid rgba(99, 102, 241, 0.10);

  /* === Elevation === */
  --elevation-0:  none;
  --elevation-1:  0 1px 3px rgba(0,0,0,0.08);
  --elevation-2:  0 4px 12px rgba(99,102,241,0.12);
  --elevation-3:  0 10px 24px rgba(99,102,241,0.15);
  --elevation-4:  0 20px 40px rgba(30,27,75,0.12);
  --elevation-5:  0 32px 64px rgba(30,27,75,0.18);  /* modals */

  /* === Spacing === */
  --space-xs:   0.25rem;   /* 4px */
  --space-sm:   0.5rem;    /* 8px */
  --space-md:   1rem;      /* 16px */
  --space-lg:   1.5rem;    /* 24px */
  --space-xl:   2rem;      /* 32px */
  --space-2xl:  3rem;      /* 48px */
  --space-3xl:  4rem;      /* 64px */

  /* === Border Radius === */
  --radius-sm:  0.375rem;  /* 6px */
  --radius-md:  0.5rem;    /* 8px */
  --radius-lg:  0.75rem;   /* 12px */
  --radius-xl:  1rem;      /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;   /* pills */

  /* === Transitions === */
  --transition-fast:   150ms ease;
  --transition-base:   200ms ease;
  --transition-slow:   300ms ease;

  /* === Typography === */
  --font-sans: 'Noto Sans Hebrew', sans-serif;
  --font-size-xs:   0.75rem;   /* 12px */
  --font-size-sm:   0.875rem;  /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg:   1.125rem;  /* 18px */
  --font-size-xl:   1.25rem;   /* 20px */
  --font-size-2xl:  1.5rem;    /* 24px */
  --font-size-3xl:  1.875rem;  /* 30px */
  --font-size-4xl:  2.25rem;   /* 36px */

  /* === Sidebar === */
  --sidebar-width:        256px;
  --sidebar-collapsed:    72px;
  --topbar-height:        56px;
}
```

---

## 3. טיפוגרפיה

| תפקיד | גודל | משקל | צבע |
|---|---|---|---|
| Page Title (h1) | 1.875rem / 30px | 700 | `--color-text` |
| Section Title (h2) | 1.5rem / 24px | 600 | `--color-text` |
| Card Title (h3) | 1.25rem / 20px | 600 | `--color-text` |
| Subsection (h4) | 1rem / 16px | 600 | `--color-text` |
| Body | 1rem / 16px | 400 | `--color-text` |
| Body Small | 0.875rem / 14px | 400 | `--color-text` |
| Label | 0.875rem / 14px | 500 | `--color-text` |
| Caption / Muted | 0.75rem / 12px | 400 | `--color-text-muted` |
| Badge Text | 0.75rem / 12px | 500 | varies |
| Table Header | 0.75rem / 12px | 600 | `--color-text-muted` uppercase |
| Button | 0.875rem / 14px | 500 | varies |

**RTL rules:** `text-align: start` בכל מקרה. `direction: rtl` על `<html>`. אין `text-right` hardcoded.

---

## 4. קטלוג רכיבים

### Button

```
Variants:
  primary   — bg: --color-primary,  hover: --color-primary-hover, text: white
  cta       — bg: --color-cta,      hover: --color-cta-hover,     text: white  [← כפתור ראשי של יצירה]
  secondary — bg: --color-primary-light, text: --color-primary, border: --color-border
  ghost     — bg: transparent, text: --color-text-muted, hover bg: --color-primary-light
  danger    — bg: --color-danger-light, text: --color-danger, hover bg: #FEE2E2

Sizes:
  sm  — px-3 py-1.5, text-sm, rounded-md, h-8
  md  — px-4 py-2,   text-sm, rounded-lg, h-10
  lg  — px-6 py-2.5, text-base, rounded-lg, h-12

States:
  hover   — 200ms, shift to -hover color
  focus   — ring-2 ring-primary ring-offset-2
  loading — show Lucide Loader2 (spin), disabled, reduced opacity
  disabled — opacity-50, cursor-not-allowed

Rule: כל button — cursor-pointer. Loading state: אייקון Loader2 מסתובב, לא טקסט.
```

### Card

```
Default (glass):
  bg: --glass-bg
  backdrop-filter: blur(--glass-blur)
  border: --glass-border
  box-shadow: --elevation-2
  border-radius: --radius-xl
  padding: --space-lg

Variants:
  flat    — bg: white, no blur, elevation-1
  raised  — elevation-3, elevation-4 on hover (transition)
  stat    — compact, with large number + label + trend indicator

Hover (on clickable cards): elevation-2 → elevation-3, 200ms (NO scale/translate)
```

### Input / Select / Textarea

```
Base:
  bg: white
  border: 1px solid --color-border-strong
  border-radius: --radius-md
  padding: 0.5rem 0.75rem (RTL-safe)
  font-size: text-sm
  color: --color-text

Focus:
  border-color: --color-primary
  box-shadow: 0 0 0 3px rgba(99,102,241,0.15)
  outline: none

Error:
  border-color: --color-danger
  box-shadow: 0 0 0 3px rgba(220,38,38,0.15)

Disabled:
  bg: --color-surface-raised
  color: --color-text-subtle
  cursor: not-allowed

Placeholder: --color-text-subtle
Width: w-full by default
```

### Badge

```
Variants:
  primary   — bg: --color-primary-light,   text: --color-primary
  success   — bg: --color-success-light,   text: #065F46
  warning   — bg: --color-warning-light,   text: #92400E
  danger    — bg: --color-danger-light,    text: --color-danger
  secondary — bg: #F1F5F9, text: #475569

Size: px-2.5 py-0.5, text-xs, font-medium, rounded-full
```

### Alert

```
Variants: error, success, info, warning
Structure: icon (16px Lucide) + title (optional) + message
Border-radius: --radius-lg
Border-inline-start: 4px solid (variant color) ← RTL: border-inline-start
Padding: --space-md
Background: variant-light color

Dismiss: X icon, top-left (RTL: top-right)
```

### DataTable

```
Container: overflow-x-auto
Table: w-full, border-collapse
TH: text-xs font-semibold uppercase text-muted, bg: --color-surface-raised,
    padding: 0.75rem 1rem, text-start, sticky top-0
TR hover: bg-primary/5, transition 150ms
TD: padding: 0.75rem 1rem, text-sm, border-bottom: 1px solid --color-border
Empty: EmptyState component (centered, icon + text + optional CTA)

שיפור: Loading state = skeleton rows (3-5 שורות אפורות מפוסיות) לא Spinner
```

### Skeleton Loading (חדש — שיפור על המקור)

```
SkeletonRow: div with animate-pulse
  - bg: linear-gradient(90deg, #E2E8F0 25%, #F8FAFC 50%, #E2E8F0 75%)
  - background-size: 200% 100%
  - animation: skeleton-shimmer 1.5s infinite
  - border-radius: --radius-sm
  - height: 1rem (text) / 2rem (cell)
  - prefers-reduced-motion: static bg, no animation

Use skeleton for: DataTable, PageHeader stats, Gradebook grid
Use Spinner for: Form submit, PDF generation, single-item loading
```

### PageHeader

```
Structure:
  - Breadcrumb (optional) — text-sm text-muted, Lucide ChevronLeft separator (RTL)
  - Title (h1, font-size-3xl)
  - Description (text-muted, text-sm, optional)
  - Actions slot (end-aligned in RTL: flex items-center gap-2 justify-start)

Border-bottom: 1px solid --color-border (if sticky)
Background: --glass-bg, backdrop-blur on sticky
```

### EmptyState (שיפור)

```
Structure:
  - Lucide icon (48px, color: --color-secondary)
  - Title (text-lg font-semibold)
  - Description (text-sm text-muted)
  - CTA Button (cta variant, optional)

Layout: flex-col items-center gap-3 py-16 text-center
Background: subtle dashed border (--color-border) rounded-xl
```

### PageShell / AppShell

```
Layout: flex h-screen overflow-hidden
  - Sidebar: fixed, width --sidebar-width, glass
  - Main: flex-1, overflow-y-auto, bg: --color-background

Mobile (< 1024px):
  - Sidebar: hidden
  - Topbar: fixed h-14, glass, has menu button (Lucide Menu)
  - Drawer: slide-in overlay, width: min(280px, calc(100% - 2rem))
  - Backdrop: bg-black/40 blur-sm
```

---

## 5. AppShell — Sidebar Navigation

```
Sidebar Layout:
  - Logo/Brand area: top, 64px height, school name
  - Nav items: list with role-based visibility
  - Bottom: user avatar + name + logout button

Nav Item Structure:
  [Icon 20px] [Label]    — flex items-center gap-3 px-3 py-2.5
  Active: bg --color-primary-light, text --color-primary, font-semibold
  Hover:  bg --color-primary-light/50, 150ms
  Inactive: text --color-text-muted

Admin Nav Items:
  LayoutDashboard    — Dashboard
  Settings2          — הגדרות בית ספר
  GraduationCap      — קבוצות ציונים
  BookOpen           — מקצועות
  Users2             — כיתות
  UserCog            — משתמשים
  UserCheck          — תלמידים
  ClipboardList      — פנקס ציונים
  Award              — תעודות
  FileImage          — תבניות תעודה

Homeroom Teacher Nav:
  ClipboardList      — פנקס ציונים
  Award              — תעודות
  Users              — התלמידים שלי

Subject Teacher Nav:
  ClipboardList      — פנקס ציונים

Section separators: hr (--color-border) between groups
```

---

## 6. מפרט עמוד — Login

```
Layout: full viewport, aurora animated background
  - bg: #F5F3FF with aurora mesh (3 blobs: primary/secondary/cta, 18% opacity, blur 80px)
  - animation: aurora-drift 12s ease infinite (disabled: prefers-reduced-motion)

Card: centered, max-w-md, glass-strong (0.95 opacity), elevation-5
  - Padding: --space-2xl
  - Border-radius: --radius-2xl
  - Logo area: Lucide GraduationCap (32px, primary) + app name (text-2xl font-bold)
  - Subtitle: "ברוכים הבאים" (text-muted)

Form:
  - Email input (type=email, autocomplete=username)
  - Password input (type=password, autocomplete=current-password) with show/hide toggle
  - Submit button: cta variant, w-full, "כניסה למערכת"
  - Error: Alert (error variant) above form
  - Loading: Loader2 spinner in button

RTL: all labels above inputs, text-start
```

---

## 7. מפרט עמוד — Dashboard (Admin)

```
Layout: AppShell + main content
  max-w-6xl mx-auto px-6 py-8

Stats Row (top): 4 stat cards in grid (2×2 mobile, 4×1 desktop)
  - כיתות פעילות (Users2 icon, primary)
  - תלמידים (UserCheck icon, cta)
  - מקצועות (BookOpen icon, secondary)
  - תעודות שהופקו (Award icon, warning)
  Stat Card: Card variant=stat, large number (text-4xl font-bold), label below

Quick Actions row: 2-3 CardButton items (link → common pages)

Recent Activity section (optional): last 5 changes (log style, text-sm)

שיפור: skeleton loading על stats בזמן טעינה
```

---

## 8. מפרט עמוד — Admin CRUD Pages

**דפים:** School Settings, Grading Sets, Subjects, Classes, Users, Students

```
Layout:
  max-w-4xl mx-auto px-6 py-8 space-y-6

PageHeader:
  - Title + description
  - Action: Button (cta, "+ הוסף X") — end of header row

Create/Edit Form Card:
  - Card (glass default)
  - Title: "הוספת X חדש" (text-lg font-semibold)
  - Fields: vertical, space-y-4
  - Label above each input
  - Inline validation: error text (text-danger text-xs) directly below field (NOT toast)
  - Buttons: "שמור" (cta) + "ביטול" (ghost) — RTL: שמור first (start), ביטול after

List Card:
  - Card (flat variant)
  - DataTable with RowActions
  - Empty: EmptyState with relevant Lucide icon
  - Loading: 5 skeleton rows

RowActions:
  - Pencil icon button (ghost, sm) — עריכה
  - Trash2 icon button (danger, sm) — מחיקה
  - Confirm delete: inline confirmation row (NOT window.confirm)
    → shows "בטוח למחוק?" + כן/לא buttons in same row, 300ms slide-in

Students page extra:
  - Import button: Upload icon + "ייבוא מ-Excel"
  - Import UI: drag-drop zone Card, dashed border --color-border, on drag: border-primary
  - Progress: ProgressBar (primary) during import
  - Results: Alert (success) with count, or Alert (error) with first error
```

---

## 9. מפרט עמוד — Gradebook

```
Layout:
  max-w-[1400px] mx-auto px-4 py-6

Filters Bar (Card, flat):
  flex gap-3 items-end
  - Select: כיתה (required)
  - Select: תקופה (required)
  - Status badge: נעול / פתוח
  - Button: "רענן" (ghost, RefreshCw icon)

Grid Area:
  - Full-width, overflow-x-auto (horizontal scroll only if needed)
  - Sticky first column (שם תלמיד) — z-index: 20
  - Sticky header row — z-index: 10
  - Cell height: 44px (touch-friendly)
  - Cell width: min 100px per subject column

Cell States:
  Empty:     bg white, border-bottom --color-border
  Filled:    bg --color-primary-light/30, text --color-primary
  Dirty:     bg --color-warning-light, yellow left border (RTL: border-inline-start)
  Saving:    subtle pulse animation
  Error:     bg --color-danger-light, red border
  Locked:    bg --color-surface-raised, text-subtle, cursor-not-allowed, LockIcon overlay

Lock Badge (שיפור על המקור):
  Column header: Badge (warning) "נעול ע״י [שם]" + Tooltip: "יפוג בעוד X דק'"
  Color coding:
    - נעול ע״י אחר: warning badge + column bg --color-warning-light/20
    - נעול עצמי: primary badge + column bg --color-primary-light/20
    - חופשי: no badge

Keyboard Shortcuts Hint (חדש — שיפור):
  Fixed bottom bar (מחוץ לגריד), glass, text-xs text-muted
  "Enter ↵ מעבר שורה • Tab ↹ מעבר עמודה • Ctrl+Z ביטול • Ctrl+S שמירה"
  Dismiss X button (מוסתר לאחר 10 שניות)

Save Status (top-right of grid):
  Idle:   — (hidden)
  Dirty:  Badge warning "שינויים שלא נשמרו"
  Saving: Badge secondary + Loader2 spin "שומר..."
  Saved:  Badge success + CheckCircle2 "נשמר" (נעלם אחר 3 שניות)
  Error:  Badge danger "שגיאה בשמירה"

Loading: skeleton grid (5 rows × 4 columns gray blocks), no Spinner
```

---

## 10. מפרט עמוד — Certificates

```
Layout:
  max-w-5xl mx-auto px-6 py-8 space-y-6

Generate Section (Card):
  Title: "הפקת תעודות"
  Filters: כיתה + תקופה selects
  Generate All: Button (cta, Award icon) "הפק תעודות לכיתה"
  Status: ProgressBar during generation, Alert on complete/error

Snapshots List (Card):
  Filters: כיתה, תקופה, חיפוש שם תלמיד
  DataTable columns: שם תלמיד | כיתה | תקופה | תאריך הפקה | סטטוס | פעולות
  RowActions: Eye (preview) + Download (PDF)

PDF Preview:
  Side panel (slide from end in RTL): width 45vw, glass, elevation-4
  Embedded iframe with PDF
  Close: X button (top-start corner in RTL)
  Loading: Spinner centered in panel
```

---

## 11. מפרט עמוד — Certificate Templates

### List Page

```
Layout: max-w-5xl mx-auto px-6 py-8
PageHeader + "תבנית חדשה" button (cta)
Grid: 3-col (desktop), 2-col (tablet), 1-col (mobile) of TemplateCards
  TemplateCard: Card (raised), preview thumbnail (iframe), name, actions (Edit, Delete)
  Empty: EmptyState with FileImage icon
```

### Designer Page ([id]/edit)

```
Layout: full-height, 3-column flex (NO scroll on outer container)

Column 1 — Settings Panel (w-64, glass, overflow-y-auto):
  - Page size, orientation selects
  - School logo upload
  - Background upload
  - Font size controls

Column 2 — Canvas (flex-1, centered):
  - White surface, subtle border, realistic shadow
  - A4 proportions
  - Draggable/resizable blocks (react-rnd)
  - Selected block: blue outline, resize handles

Column 3 — Properties Panel (w-64, glass, overflow-y-auto):
  - Block-specific controls (font, size, color, alignment)
  - Empty state: "בחר אלמנט לעריכה"

Toolbar (above canvas): action buttons
  - Preview (Eye), Save (Save), Reset (RotateCcw)

Mobile: collapse to single column + tabs
```

---

## 12. מפרט עמוד — Teacher Dashboard

```
Layout: max-w-4xl mx-auto px-6 py-8

Welcome card: "שלום [שם]" (text-2xl), role badge, school name
Quick stats: כיתות, מקצועות, תלמידים (smaller stat cards, 3-col)
My Assignments table: מקצוע | כיתה | קבוצה | status lock
Quick links: "עבור לפנקס ציונים" (cta button)
```

---

## 13. מפרט עמוד — Teacher Gradebook

```
זהה ל-Admin Gradebook (סעיף 9) עם ההבדלים:
- Filters: כיתה + מקצוע + תקופה (רק assignments שלהם)
- Grid: עריכה מלאה לתלמידים שלהם
- Lock acquisition: אוטומטי בפתיחת עמוד (POST /locks/acquire)
- Heartbeat: כל 60 שניות (בשקט, ללא UI)
- Release: ב-beforeunload
- Lock conflict UI:
    Full-page overlay (semi-transparent glass): 
    LockKeyhole icon (48px, warning) + "העמודה נעולה ע״י [שם]" + "יפוג בעוד X דקות"
    Button: "המתן" (ghost) — ידחה 30 שניות ויבדק שוב
```

---

## 14. אינטראקציות גלובליות

### Toast Notifications (חדש — מוסיף)

```
מיקום: bottom-start (RTL: שמאל למטה) — fixed, z-50
Stack: עד 3 toasts בו-זמנית, newest on top
Animation: slide-in from bottom (200ms), auto-dismiss 4s
Variants: success (CheckCircle2), error (AlertCircle), info (Info)
Dismiss: X button

שימוש ב-Toast: הצלחות כלליות (שמירה, מחיקה, ייבוא)
שימוש ב-inline Alert: שגיאות טופס, מצב נעילה
```

### Form Validation

```
Timing: onBlur + onSubmit (לא onChange)
Display: טקסט שגיאה אדום (text-xs text-danger) מתחת לשדה, מיד אחרי blur
Border: input עם border-danger + ring-danger/15
Success field: border-success (ירוק) רק אחרי submit מוצלח (לא real-time)
Required indicator: * (text-danger) אחרי label (RTL: אחרי = לשמאל ה-label)
```

### Loading States

```
Table/Grid data:   Skeleton rows (shimmer)
Form submit:       Button loading state (Loader2 spin)
Page navigation:   Subtle top progress bar (primary color, 2px height)
PDF generation:    Spinner centered in preview area + "מייצר PDF..." text
Single record:     Spinner inline
```

### Confirm Delete

```
לא window.confirm()
Inline row replacement:
  [שם פריט] — "בטוח למחוק?" [כן, מחק] [ביטול]
  Animation: 200ms slide-in, danger-light background on row
  Auto-cancel: 10 שניות ללא פעולה → חזור לשורה רגילה
```

---

## 15. RTL Rules

```
1. html: dir="rtl" lang="he"
2. flex row: ברירת מחדל נכונה ב-RTL (אין להפוך ידנית)
3. text-align: תמיד text-start (לא text-right)
4. padding/margin: תמיד ps/pe/ms/me (logical properties) — לא pl/pr/ml/mr
5. border: border-inline-start / border-inline-end (לא border-l/r)
6. icons לפני טקסט: בכיתה flex, האייקון מופיע ב-start (ימין ב-RTL)
7. Lucide ChevronRight/Left: להפוך סמנטיקה — "חזרה" = ChevronLeft ב-LTR = ChevronRight ב-RTL
   פתרון: השתמש ב-ChevronRight לכל ה-breadcrumb ואל תהפוך — ב-RTL זה כבר "קדימה"
8. Sticky columns בגריד: inset-inline-start: 0 (לא left: 0)
9. Slide-in panels: מגיעים מ-end (שמאל ב-RTL): translate-x (חיובי להסתרה, שלילי לפתיחה)
10. Scrollbar: עבור overflow-x בגריד — neutral (לא RTL-specific)
```

---

## 16. Mobile Breakpoints

### 375px (mobile S)
- AppShell: topbar only (56px), sidebar hidden, drawer on Menu click
- DataTable: horizontal scroll, min cell width 80px
- Gradebook: horizontal scroll, sticky first column
- Designer: not supported (show "פתח במסך גדול" message)
- Forms: single column, full-width inputs
- Stats: 2×2 grid

### 768px (tablet)
- AppShell: topbar + drawer (wider: 320px)
- DataTable: all columns visible
- Gradebook: visible (may scroll horizontally)
- Designer: 2-column (settings + canvas)
- Stats: 4×1 or 2×2

### 1024px (laptop)
- AppShell: full sidebar (--sidebar-width: 256px)
- All pages: fully functional
- Gradebook: all columns, max-w-[1400px]
- Designer: 3 columns

### 1440px (desktop)
- Max-width containers: centered
- Gradebook: 1400px max (overflow hidden — no horizontal scroll at this width)
- Extra whitespace: generous gutters

---

## 17. Accessibility

```
- Focus visible: ring-2 ring-primary ring-offset-2 on all interactive elements
- Keyboard nav: Tab order logical (RTL: right→left, top→bottom)
- ARIA labels: על icon-only buttons (aria-label="מחק")
- Screen reader: aria-live="polite" על toast region
- Color alone: אין להסתמך על צבע בלבד (תמיד + icon + text)
- Contrast: 4.5:1 על גוף טקסט, 3:1 על כותרות גדולות
- prefers-reduced-motion: 
    - Aurora animation: disabled
    - Skeleton shimmer: static gradient
    - Transitions: 0ms
- Semantic HTML: button, nav, main, header, label[for=id]
```

---

## 18. שיפורים על team-yuri-kedem

| תחום | מקור | שיפור |
|---|---|---|
| Loading | Spinner בטבלאות | Skeleton shimmer rows |
| Delete confirm | window.confirm() | Inline row confirmation |
| Form errors | Toast או ללא | Inline תחת שדה (onBlur) |
| Gradebook hints | אין | Keyboard shortcuts bar (dismissible) |
| Lock visualization | Badge פשוט | Column tinting + tooltip עם זמן פקיעה |
| Toast system | אין | Toast stack (bottom-start) |
| Empty states | מינימלי | Illustrated EmptyState עם CTA |
| Delete row | מחיקה מיידית | Confirmation inline + auto-cancel |
| Progress bar | אין | Top page-load progress bar |
| PDF preview | Iframe מלא | Side panel (45vw) — לא מסתיר את הרשימה |

---

## 19. Tailwind Config Extensions

```ts
// tailwind.config.ts additions
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: '#6366F1', hover: '#4F46E5', light: '#EEF2FF' },
      secondary: '#818CF8',
      cta: { DEFAULT: '#10B981', hover: '#059669' },
      danger: { DEFAULT: '#DC2626', light: '#FEF2F2' },
      warning: { DEFAULT: '#F59E0B', light: '#FFFBEB' },
      text: { DEFAULT: '#1E1B4B', muted: '#475569', subtle: '#94A3B8' },
      background: '#F5F3FF',
      surface: '#FFFFFF',
    },
    fontFamily: {
      sans: ['var(--font-noto-sans-hebrew)', 'sans-serif'],
    },
    boxShadow: {
      'elevation-1': '0 1px 3px rgba(0,0,0,0.08)',
      'elevation-2': '0 4px 12px rgba(99,102,241,0.12)',
      'elevation-3': '0 10px 24px rgba(99,102,241,0.15)',
      'elevation-4': '0 20px 40px rgba(30,27,75,0.12)',
      'elevation-5': '0 32px 64px rgba(30,27,75,0.18)',
    },
    backdropBlur: {
      glass: '16px',
    },
    keyframes: {
      'aurora-drift': {
        '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
        '33%':       { transform: 'translate(3%, -4%) scale(1.05)' },
        '66%':       { transform: 'translate(-2%, 3%) scale(0.98)' },
      },
      'skeleton-shimmer': {
        '0%':   { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
    },
    animation: {
      'aurora': 'aurora-drift 12s ease infinite',
      'skeleton': 'skeleton-shimmer 1.5s infinite linear',
    },
  },
}
```

---

## 20. Anti-Patterns — אסור בהחלט

```
❌ window.confirm() / window.alert()
❌ אמוג'י כאייקונים
❌ text-right / text-left hardcoded (השתמש ב-text-start/end)
❌ padding-left/right / margin-left/right (השתמש ב-ps/pe/ms/me)
❌ left-0/right-0 positioning (השתמש ב-inset-inline-start/end)
❌ Scale transform בהover של שורות טבלה
❌ Dark mode (light mode only)
❌ Inter/Roboto/Arial fonts
❌ border-l/r (השתמש ב-border-inline-start/end)
❌ שגיאות רק ב-toast (תמיד inline בטפסים)
❌ Spinner על טבלאות גדולות (השתמש ב-skeleton)
```

---

**מסמך זה מחייב ל-Phase 7 ואילך. כל סטייה דורשת עדכון כאן.**
