# עיצוב UX — School Gradebook SaaS
> שלושה קונספטים עצמאיים. בחר אחד ויישם אותו ברחבי המערכת.
> כל הממשק: `dir="rtl"` `lang="he"`. Stack: Next.js 14 + Tailwind CSS 3.4.

---

# קונספט 1 — לוח מחשבים (Command Center)

> **תגית:** _"כל ציון — פקודה. כל כיתה — משימה."_

**ויז'ן:** חדר בקרה לפקד עליו. Dark mode, terminal-inspired, data-forward. המשתמש מרגיש כמו מנהל מערכות שיודע בדיוק מה קורה. כל נתון נגיש מיידית, ללא קישוט.

---

## 1.1 פלטת צבעים

```css
/* ─── Command Center Color System ─── */
:root {
  /* Backgrounds — שכבות עומק */
  --cc-bg-base:       #0B1120;   /* OLED deep navy — רקע ראשי */
  --cc-bg-surface:    #111827;   /* Surface — כרטיסים, sidebar */
  --cc-bg-elevated:   #1C2536;   /* Elevated — מודאלים, dropdowns */
  --cc-bg-overlay:    #252F42;   /* Hover state, active row */

  /* Primary — Electric Cyan */
  --cc-primary:       #06B6D4;   /* Cyan-500 — primary actions */
  --cc-primary-dim:   #0891B2;   /* Cyan-600 — hover state */
  --cc-primary-glow:  rgba(6,182,212,0.15);  /* Focus ring / glow */
  --cc-primary-text:  #67E8F9;   /* Cyan-300 — links, active nav */

  /* CTA — Amber */
  --cc-cta:           #F59E0B;   /* Amber-400 — CTA primary */
  --cc-cta-hover:     #D97706;   /* Amber-500 — hover */
  --cc-cta-text:      #0B1120;   /* Dark text on amber */

  /* Semantic */
  --cc-success:       #10B981;   /* Emerald — ציון גבוה, נעול */
  --cc-warning:       #FBBF24;   /* Amber — ציון בינוני */
  --cc-danger:        #F87171;   /* Red-400 — ציון נמוך, שגיאה */
  --cc-info:          #60A5FA;   /* Blue-400 — מידע */

  /* Text */
  --cc-text-primary:  #F1F5F9;   /* Slate-100 */
  --cc-text-secondary:#94A3B8;   /* Slate-400 */
  --cc-text-muted:    #475569;   /* Slate-600 */
  --cc-text-disabled: #1E293B;   /* Slate-800 */

  /* Borders */
  --cc-border:        rgba(6,182,212,0.12);
  --cc-border-strong: rgba(6,182,212,0.28);
  --cc-border-focus:  #06B6D4;

  /* Grade color coding */
  --cc-grade-a:       #10B981;   /* 90–100 */
  --cc-grade-b:       #60A5FA;   /* 80–89 */
  --cc-grade-c:       #FBBF24;   /* 70–79 */
  --cc-grade-d:       #FB923C;   /* 60–69 */
  --cc-grade-f:       #F87171;   /* <60 */
}
```

| תפקיד | צבע | Hex | שימוש |
|-------|-----|-----|-------|
| Base BG | ████ | `#0B1120` | רקע כל הדף |
| Surface | ████ | `#111827` | כרטיסים, sidebar |
| Primary | ████ | `#06B6D4` | כפתורים ראשיים, active states |
| CTA | ████ | `#F59E0B` | "שמור", "צור תעודה" |
| Success | ████ | `#10B981` | ציונים גבוהים, נעול |
| Danger | ████ | `#F87171` | שגיאות, ציונים נמוכים |

---

## 1.2 טיפוגרפיה

```css
/* Hebrew RTL: Heebo — clean, technical, supports all Hebrew weights */
/* Data/Numbers: JetBrains Mono — precision monospace */
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --cc-font-ui:   'Heebo', 'Noto Sans Hebrew', sans-serif;
  --cc-font-mono: 'JetBrains Mono', 'Courier New', monospace;

  /* Type scale */
  --cc-text-xs:   0.75rem;   /* 12px — labels, badges */
  --cc-text-sm:   0.875rem;  /* 14px — table cells, secondary */
  --cc-text-base: 1rem;      /* 16px — body */
  --cc-text-lg:   1.125rem;  /* 18px — section headings */
  --cc-text-xl:   1.25rem;   /* 20px — page titles */
  --cc-text-2xl:  1.5rem;    /* 24px — dashboard stats */
  --cc-text-4xl:  2.25rem;   /* 36px — big KPI numbers */

  /* Weights */
  --cc-weight-normal: 400;
  --cc-weight-medium: 500;
  --cc-weight-semi:   600;
  --cc-weight-bold:   700;
}
```

**כלל:** Hebrew text → `font-family: var(--cc-font-ui)`. ציונים, timestamps, IDs → `font-family: var(--cc-font-mono)`.

---

## 1.3 Spacing & Radius

```css
:root {
  /* Spacing — 4pt grid */
  --cc-space-1:  0.25rem;   /* 4px */
  --cc-space-2:  0.5rem;    /* 8px */
  --cc-space-3:  0.75rem;   /* 12px */
  --cc-space-4:  1rem;      /* 16px */
  --cc-space-6:  1.5rem;    /* 24px */
  --cc-space-8:  2rem;      /* 32px */
  --cc-space-12: 3rem;      /* 48px */

  /* Border radius — minimal, sharp */
  --cc-radius-sm: 0.25rem;  /* 4px — badges, chips */
  --cc-radius-md: 0.375rem; /* 6px — inputs, buttons */
  --cc-radius-lg: 0.5rem;   /* 8px — cards */

  /* Layout */
  --cc-sidebar-width: 240px;
  --cc-topbar-height: 52px;
  --cc-content-max:   1440px;

  /* Shadows — cyan-tinted */
  --cc-shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --cc-shadow-md: 0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.08);
  --cc-shadow-lg: 0 10px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.12);

  /* Transitions */
  --cc-transition-fast: 120ms ease;
  --cc-transition-base: 200ms ease;
  --cc-transition-slow: 300ms ease-out;
}
```

---

## 1.4 מסכי מפתח — ASCII Mockups

### מסך 1: Login

```
┌─────────────────────────────────────────────────────────────┐  bg: #0B1120
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  ██████  █████  ████  █████   ██████ ██████ █████   │  │  Logo: monospace
│   │  ██   ██ ██  ██ ██ ██ ██  ██  ██     ██  ██ ██  ██  │  │  color: #06B6D4
│   │  ██████  █████  ████  █████   ██████ ██████ █████   │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │  card bg: #111827
│   │                                                     │  │  border: 1px #06B6D4/20
│   │   > ניהול בית ספר / v2.4.1                         │  │  font-mono, color: #67E8F9
│   │   ──────────────────────────────────────────────── │  │  border-b: #06B6D4/15
│   │                                                     │  │
│   │   שם משתמש                                          │  │  label: #94A3B8, text-sm
│   │   ┌─────────────────────────────────────────────┐  │  │
│   │   │ admin@school.co.il                          │  │  │  input bg: #1C2536
│   │   └─────────────────────────────────────────────┘  │  │  border: #06B6D4/28
│   │                                                     │  │
│   │   סיסמה                                             │  │
│   │   ┌─────────────────────────────────────────────┐  │  │
│   │   │ ••••••••••••                           [👁]  │  │  │
│   │   └─────────────────────────────────────────────┘  │  │
│   │                                                     │  │
│   │   ┌─────────────────────────────────────────────┐  │  │  btn: bg #06B6D4
│   │   │            כניסה למערכת ←                   │  │  │  text: #0B1120, font-bold
│   │   └─────────────────────────────────────────────┘  │  │
│   │                                                     │  │
│   │   שכחתי סיסמה                                       │  │  color: #67E8F9, underline
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   [●] מנהל בית ספר    [○] מנהל על    [○] מורה             │  role selector: pills
└─────────────────────────────────────────────────────────────┘
```

**אינטראקציה:**
- Input `focus`: border → `#06B6D4`, subtle glow `box-shadow: 0 0 0 3px rgba(6,182,212,0.15)`
- Button `hover`: `background: #0891B2`, `transform: translateY(-1px)`
- Role pills: instant switch, 120ms color transition

---

### מסך 2: Dashboard (Admin)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ▶ ניהול ב"ס אורט                              [🔔2] [admin@] [⚙]       │  topbar: #111827
├──────────────┬───────────────────────────────────────────────────────────┤  border-b: #06B6D4/20
│              │                                                            │
│  ≡ ניהול     │  ¦¦¦¦¦¦ לוח בקרה                                          │
│              │                                                            │
│  ◈ לוח בקרה  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  KPI cards
│  ◻ כיתות     │  │  תלמידים │ │  מורים   │ │  כיתות   │ │ תעודות   │    │  bg: #1C2536
│  ◻ תלמידים   │  │          │ │          │ │          │ │          │    │  border-t: 2px cyan
│  ◻ מקצועות   │  │   483    │ │    31    │ │    18    │ │   127    │    │  number: text-4xl
│  ◻ ציונים    │  │ +12 החודש│ │  פעילים  │ │  פעילות  │ │ הופקו    │    │  mono, #06B6D4
│  ◻ תעודות    │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│  ─────────── │                                                            │
│  ◻ משתמשים   │  ┌──────────────────────────┐  ┌───────────────────────┐ │
│  ◻ הגדרות    │  │  כיתות פעילות            │  │  פעילות אחרונה       │ │  tables: #111827
│              │  │  ──────────────────────  │  │  ─────────────────── │ │
│  ─────────── │  │  ז'1   ▓▓▓▓▓▓▓░  78%   │  │  ⊙ ת. מתמטיקה ז'1   │ │  progress bars
│  [v2.4.1]    │  │  ח'2   ▓▓▓▓▓░░░  61%   │  │    לפני 12 דקות      │ │
│  [יציאה ←]   │  │  ט'3   ▓▓▓▓▓▓▓▓  92%   │  │  ⊙ נעילת תקופה ח'1   │ │
│              │  │  י'1   ▓▓▓▓░░░░  55%   │  │    לפני שעה          │ │
│              │  │                          │  │  ⊙ תעודה הופקה       │ │
│              │  │  [צפה בכל הכיתות →]     │  │  [כל הפעילות →]      │ │
│              │  └──────────────────────────┘  └───────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────┘
sidebar: #111827/240px   active item: bg #06B6D4/10, border-r 2px #06B6D4
```

---

### מסך 3: Gradebook Grid

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← כיתה ז'1    תקופה ב'  [▼נעול]    [+ הוסף הערה]   [📄 הפק תעודות]        │  topbar strip
├──────────────────────────────────────────────────────────────────────────────┤
│  [🔍 חפש תלמיד...]   [מקצוע ▼]   [מיון ▼]    ∑ 24 תלמידים  ⌀ 78.4          │  toolbar
├──────────────────────────────────────────────────────────────────────────────┤
│  #  │ שם תלמיד       │ מתמטיקה  │ אנגלית   │ עברית    │ מדעים   │ ממוצע    │
│  ──────────────────────────────────────────────────────────────────────────  │  header bg: #1C2536
│  1  │ אברהם כהן      │  [91]    │  [84]    │  [88]    │  [95]   │  89.5    │  mono numbers
│  2  │ שרה לוי        │  [78]    │  [92]    │  [71]    │  [85]   │  81.5    │  row hover: #252F42
│  3  │ דוד גולד       │  [45]    │  [61]    │  [52]    │  [58]   │  54.0    │  row-3: danger glow
│  4  │ מרים בן-דוד    │  [88]    │  [79]    │  [90]    │  [82]   │  84.8    │
│  5  │ יוסף אברמוביץ  │  [72]    │  [—]     │  [68]    │  [75]   │  71.7    │  — = missing grade
│  6  │ רחל פרידמן     │  [99]    │  [97]    │  [95]    │  [98]   │  97.3    │  ★ top student
│     │                │          │          │          │         │          │
│  ──────────────────────────────────────────────────────────────────────────  │
│  ⌀ ממוצע כיתה       │   78.6   │   82.3   │   76.9   │   81.4  │   79.8   │  summary row
└──────────────────────────────────────────────────────────────────────────────┘

  Grade cell colors:
  [91] = bg: #10B981/10, color: #10B981, border: #10B981/20  (A)
  [78] = bg: #60A5FA/10, color: #60A5FA, border: #60A5FA/20  (B)
  [45] = bg: #F87171/10, color: #F87171, border: #F87171/20  (F)
  [—]  = bg: #1C2536,    color: #475569, border: #06B6D4/15  (missing)
```

---

## 1.5 קומפוננטים

### Button
```css
/* Primary */
.btn-primary {
  background: var(--cc-primary);
  color: #0B1120;
  font-family: var(--cc-font-ui);
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border-radius: var(--cc-radius-md);
  border: 1px solid transparent;
  transition: all var(--cc-transition-fast);
}
.btn-primary:hover {
  background: var(--cc-primary-dim);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(6,182,212,0.25);
}

/* CTA */
.btn-cta {
  background: var(--cc-cta);
  color: var(--cc-cta-text);
  font-weight: 700;
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--cc-primary-text);
  border: 1px solid var(--cc-border-strong);
}
.btn-ghost:hover {
  background: var(--cc-primary-glow);
  border-color: var(--cc-primary);
}
```

### Card
```css
.card {
  background: var(--cc-bg-surface);
  border: 1px solid var(--cc-border);
  border-radius: var(--cc-radius-lg);
  padding: var(--cc-space-6);
  box-shadow: var(--cc-shadow-md);
}
/* KPI card top accent */
.card-kpi {
  border-top: 2px solid var(--cc-primary);
}
/* Hover / interactive card */
.card:hover {
  border-color: var(--cc-border-strong);
  box-shadow: var(--cc-shadow-lg);
  transition: all var(--cc-transition-base);
}
```

### Grade Badge
```html
<!-- A: 90-100 -->
<span class="grade-badge grade-a">91</span>
<!-- F: <60 -->
<span class="grade-badge grade-f">45</span>
```
```css
.grade-badge {
  font-family: var(--cc-font-mono);
  font-size: var(--cc-text-sm);
  font-weight: 500;
  padding: 0.2rem 0.6rem;
  border-radius: var(--cc-radius-sm);
  border: 1px solid;
  display: inline-block;
  min-width: 3rem;
  text-align: center;
}
.grade-a { color: #10B981; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); }
.grade-b { color: #60A5FA; background: rgba(96,165,250,0.1); border-color: rgba(96,165,250,0.2); }
.grade-c { color: #FBBF24; background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.2); }
.grade-d { color: #FB923C; background: rgba(251,146,60,0.1); border-color: rgba(251,146,60,0.2); }
.grade-f { color: #F87171; background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.2); }
```

---

## 1.6 אנימציות

```css
/* Micro-interactions: 120-200ms only */
/* No decorative animations — only purposeful */

/* Row hover in gradebook */
@keyframes rowHighlight {
  from { background: transparent; }
  to   { background: var(--cc-bg-overlay); }
}

/* Loading shimmer for skeleton */
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.skeleton {
  background: linear-gradient(90deg, #1C2536 25%, #252F42 50%, #1C2536 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--cc-radius-sm);
}

/* Grade cell edit mode */
.grade-cell:focus-within {
  outline: 2px solid var(--cc-primary);
  outline-offset: -1px;
  background: var(--cc-bg-elevated);
  transition: all var(--cc-transition-fast);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 1.7 Accessibility

- **Contrast**: כל טקסט על #0B1120 עומד ב-WCAG AA. Text-primary `#F1F5F9` = 14.3:1 ratio.
- **Focus rings**: `outline: 2px solid #06B6D4` + `outline-offset: 2px` על כל interactive elements.
- **Grade colors**: אל תסתמך על צבע בלבד — הצג תמיד את המספר לצד הצבע.
- **Keyboard nav**: Tab order = sidebar → topbar → main content → actions. Escape = סגור modal.
- **ARIA**: `role="grid"` על הגרידבוק. `aria-label` על כל icon-only button.

---

## 1.8 מתי לבחור Command Center

✅ המשתמשים הם מנהלים/מורים שעובדים שעות ארוכות מול המסך  
✅ Data density גבוהה — הרבה ציונים בו-זמנית  
✅ הורים לא משתמשים ישירות במערכת  
✅ רוצים להרגיש מקצועי ו"כבד"  
❌ לא מתאים אם הורים/תלמידים יצפו במסכים אלו ישירות

---
---

# קונספט 2 — חצר בית ספר (Schoolyard)

> **תגית:** _"חם כמו כיתה. חד כמו ציון."_

**ויז'ן:** מקצועי אבל לא קר. המורה מרגישה בבית. רמות עגולות, צבעים חמים, whitespace נדיב. מערכת שמורים אוהבים לפתוח בבוקר.

---

## 2.1 פלטת צבעים

```css
/* ─── Schoolyard Color System ─── */
:root {
  /* Backgrounds */
  --sy-bg-base:       #FEFCE8;   /* Warm cream — yellowy white */
  --sy-bg-surface:    #FFFFFF;   /* Cards, panels */
  --sy-bg-elevated:   #FFFBF0;   /* Popovers, hover states */
  --sy-bg-muted:      #F5F0E8;   /* Secondary sections, disabled */
  --sy-bg-sand:       #FEF3C7;   /* Amber-50 — highlight band */

  /* Primary — Warm Teal */
  --sy-primary:       #0D9488;   /* Teal-600 */
  --sy-primary-light: #14B8A6;   /* Teal-500 — hover */
  --sy-primary-pale:  #CCFBF1;   /* Teal-100 — bg tint */
  --sy-primary-text:  #0F766E;   /* Teal-700 — text on light bg */

  /* Accent — Terracotta */
  --sy-accent:        #EA580C;   /* Orange-600 */
  --sy-accent-light:  #F97316;   /* Orange-500 — hover */
  --sy-accent-pale:   #FFEDD5;   /* Orange-100 */

  /* Secondary — Warm Yellow */
  --sy-secondary:     #CA8A04;   /* Yellow-600 — highlights */
  --sy-secondary-pale:#FEF9C3;   /* Yellow-50 */

  /* Semantic */
  --sy-success:       #16A34A;   /* Green-600 */
  --sy-success-pale:  #DCFCE7;   /* Green-100 */
  --sy-warning:       #D97706;   /* Amber-600 */
  --sy-warning-pale:  #FEF3C7;   /* Amber-100 */
  --sy-danger:        #DC2626;   /* Red-600 */
  --sy-danger-pale:   #FEE2E2;   /* Red-100 */

  /* Text */
  --sy-text-primary:  #1C1917;   /* Stone-900 */
  --sy-text-secondary:#57534E;   /* Stone-600 */
  --sy-text-muted:    #A8A29E;   /* Stone-400 */

  /* Borders */
  --sy-border:        #E8E0D0;   /* Warm gray */
  --sy-border-strong: #D6C9B8;
  --sy-border-focus:  #0D9488;

  /* Grade color coding (badges — soft) */
  --sy-grade-a-bg:    #DCFCE7;  --sy-grade-a-text: #15803D;
  --sy-grade-b-bg:    #DBEAFE;  --sy-grade-b-text: #1D4ED8;
  --sy-grade-c-bg:    #FEF9C3;  --sy-grade-c-text: #A16207;
  --sy-grade-d-bg:    #FFEDD5;  --sy-grade-d-text: #C2410C;
  --sy-grade-f-bg:    #FEE2E2;  --sy-grade-f-text: #B91C1C;
}
```

| תפקיד | צבע | Hex | שימוש |
|-------|-----|-----|-------|
| Cream BG | ████ | `#FEFCE8` | רקע |
| Primary | ████ | `#0D9488` | כפתורים, active, links |
| Accent | ████ | `#EA580C` | CTA, notifications |
| Surface | ████ | `#FFFFFF` | כרטיסים |
| Text | ████ | `#1C1917` | טקסט ראשי |

---

## 2.2 טיפוגרפיה

```css
/* Rubik — rounded sans, FULL Hebrew support, warm character */
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap');

:root {
  --sy-font:        'Rubik', 'Noto Sans Hebrew', sans-serif;

  --sy-text-xs:   0.75rem;    /* 12px — meta, captions */
  --sy-text-sm:   0.875rem;   /* 14px — helper, secondary */
  --sy-text-base: 1rem;       /* 16px — body */
  --sy-text-lg:   1.125rem;   /* 18px — subheadings */
  --sy-text-xl:   1.25rem;    /* 20px — card titles */
  --sy-text-2xl:  1.5rem;     /* 24px — section titles */
  --sy-text-3xl:  1.875rem;   /* 30px — page title */
  --sy-text-4xl:  2.25rem;    /* 36px — big stats */
}
```

**כלל:** Rubik weight 500 לכל הממשק. Rubik 700 לכותרות, 400 לגוף, 600 לכפתורים.

---

## 2.3 Spacing & Radius

```css
:root {
  /* Spacing */
  --sy-space-2:  0.5rem;
  --sy-space-3:  0.75rem;
  --sy-space-4:  1rem;
  --sy-space-5:  1.25rem;
  --sy-space-6:  1.5rem;
  --sy-space-8:  2rem;
  --sy-space-10: 2.5rem;
  --sy-space-12: 3rem;
  --sy-space-16: 4rem;

  /* Border radius — warm, rounded */
  --sy-radius-sm:  0.5rem;   /* 8px — badges, chips */
  --sy-radius-md:  0.75rem;  /* 12px — inputs, buttons */
  --sy-radius-lg:  1rem;     /* 16px — cards */
  --sy-radius-xl:  1.5rem;   /* 24px — modals, large cards */
  --sy-radius-full: 9999px;  /* pills */

  /* Layout */
  --sy-sidebar-width: 264px;
  --sy-topbar-height: 64px;

  /* Shadows — warm, soft */
  --sy-shadow-sm: 0 1px 4px rgba(28,25,23,0.06);
  --sy-shadow-md: 0 4px 16px rgba(28,25,23,0.08), 0 1px 4px rgba(28,25,23,0.04);
  --sy-shadow-lg: 0 12px 32px rgba(28,25,23,0.10), 0 2px 8px rgba(28,25,23,0.06);
  --sy-shadow-teal: 0 4px 16px rgba(13,148,136,0.18);
}
```

---

## 2.4 מסכי מפתח — ASCII Mockups

### מסך 1: Login

```
 ┌─────────────────────────────────────────────────────────────┐  bg: #FEFCE8
 │                                                             │
 │                    🏫                                       │  icon illustration (SVG)
 │             מערכת ציונים                                    │  text-3xl, font-700, #1C1917
 │          ניהול בית ספר — כניסה                             │  text-base, #57534E
 │                                                             │
 │   ┌─────────────────────────────────────────────────────┐  │  card: white, radius-xl
 │   │                                               ╮     │  │  shadow-lg, padding: 2.5rem
 │   │   שלום! ✦  נשמח לראותך שוב                  ╰     │  │  warm greeting
 │   │                                                     │  │  color: #0D9488, text-xl, 700
 │   │   ─────────────────────────────────────────────     │  │  border-b: #E8E0D0
 │   │                                                     │  │
 │   │   כתובת מייל                                        │  │  label: #57534E, text-sm, 500
 │   │   ╭────────────────────────────────────────────╮   │  │
 │   │   │  admin@school.co.il                        │   │  │  input: radius-md, border #E8E0D0
 │   │   ╰────────────────────────────────────────────╯   │  │  focus: border #0D9488, shadow-teal
 │   │                                                     │  │
 │   │   סיסמה                                             │  │
 │   │   ╭────────────────────────────────────────────╮   │  │
 │   │   │  ••••••••••                           [👁]  │   │  │
 │   │   ╰────────────────────────────────────────────╯   │  │
 │   │                                                     │  │
 │   │   ╭────────────────────────────────────────────╮   │  │  CTA btn: bg #EA580C
 │   │   │       ← כניסה למערכת                       │   │  │  text: white, radius-md
 │   │   ╰────────────────────────────────────────────╯   │  │  hover: bg #F97316, shadow-lg
 │   │                                                     │  │
 │   │          שכחתי את הסיסמה                            │  │  link: #0D9488, underline
 │   └─────────────────────────────────────────────────────┘  │
 │                                                             │
 │   מנהל  ●────────○  מורה    (role toggle)                   │  pills: #E8E0D0 bg, active: teal
 └─────────────────────────────────────────────────────────────┘
```

---

### מסך 2: Dashboard (Teacher)

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  🏫 מערכת ציונים           [🔔] [שרה לוי ▼]                            │  topbar: white
 ├──────────────────────┬───────────────────────────────────────────────────┤  border-b: #E8E0D0
 │                      │                                                    │
 │  [👤] שרה לוי        │   ☀️  בוקר טוב, שרה!                            │  greeting, text-3xl 700
 │  מחנכת ז'1           │   יום שני, 14 ביולי 2026                         │  #57534E, text-base
 │  ─────────────────   │                                                    │
 │                      │  ┌────────────────────┐  ┌────────────────────┐  │
 │  🏠 לוח בקרה         │  │  הכיתה שלי — ז'1  │  │  ממוצע הכיתה      │  │  stat cards
 │  📚 ספר ציונות       │  │                    │  │                    │  │  white, radius-xl
 │  👥 התלמידים שלי     │  │  👥 24 תלמידים    │  │     ⌀  78.4       │  │  shadow-md
 │  📜 תעודות           │  │  🔴 3 ציונים חסרים │  │  ▲ 2.1 מהתקופה   │  │  primary stat: text-4xl
 │  ─────────────────   │  └────────────────────┘  └────────────────────┘  │  accent: #0D9488
 │  ⚙️ הגדרות           │                                                    │
 │  ← יציאה            │  ┌────────────────────────────────────────────┐   │
 │                      │  │  מקצועות — מה חסר?                       │   │  missing grades card
 │                      │  │  ─────────────────────────────────────    │   │  bg: #FFEDD5
 │                      │  │  ⚠ מתמטיקה    3 תלמידים ללא ציון →      │   │  border: #EA580C/30
 │                      │  │  ⚠ אנגלית     1 תלמיד ללא ציון →        │   │  radius-xl
 │                      │  │  ✅ עברית      הכל מלא                    │   │
 │                      │  └────────────────────────────────────────────┘   │
 │                      │                                                    │
 │                      │  ┌──────────────┐  ┌──────────────┐              │
 │                      │  │  [← ספר ציונות] │  │  [📜 הפק תעודות] │       │  action buttons
 │                      │  │  פתח עכשיו      │  │  5 מוכנות       │       │  primary / accent
 │                      │  └──────────────┘  └──────────────┘              │
 └──────────────────────┴───────────────────────────────────────────────────┘
sidebar: white, shadow-md, 264px     active: bg #CCFBF1, color #0F766E, border-r 3px #0D9488
```

---

### מסך 3: Gradebook Grid

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  ← חזרה   📚 ספר ציונות — ז'1   ╱  תקופה ב'  ╱  [מנעול פתוח ✓]            │  breadcrumb topbar
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  [🔍 חפש תלמיד...]     [מקצוע ▼]    [ייצא CSV ↓]    ⌀ 78.4    24 תלמידים  │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │  שם תלמיד        │  מתמטיקה  │  אנגלית   │  עברית   │  מדעים  │  ממוצע    │
 │  ─────────────────────────────────────────────────────────────────────────── │  header: bg #F5F0E8
 │  אברהם כהן       │  ╭──╮     │  ╭──╮     │  ╭──╮    │  ╭──╮   │  89.5 ★   │
 │                  │  │91│     │  │84│     │  │88│    │  │95│   │           │  grade pills
 │                  │  ╰──╯     │  ╰──╯     │  ╰──╯    │  ╰──╯   │           │  radius-full, soft bg
 │  ───────────────────────────────────────────────────────────────────────     │
 │  שרה לוי         │  ╭──╮     │  ╭──╮     │  ╭──╮    │  ╭──╮   │  81.5    │
 │                  │  │78│     │  │92│     │  │71│    │  │85│   │           │
 │                  │  ╰──╯     │  ╰──╯     │  ╰──╯    │  ╰──╯   │           │
 │  ───────────────────────────────────────────────────────────────────────     │
 │  דוד גולד ⚠      │  ╭──╮     │  ╭──╮     │  ╭──╮    │  ╭──╮   │  54.0 ▼  │  warning icon
 │                  │  │45│     │  │61│     │  │52│    │  │58│   │           │  row-bg: #FEE2E2/30
 │                  │  ╰──╯     │  ╰──╯     │  ╰──╯    │  ╰──╯   │           │
 │  ───────────────────────────────────────────────────────────────────────     │
 │  ⌀ ממוצע        │   78.6    │   82.3    │   76.9   │   81.4  │   79.8   │  summary: bg #F5F0E8
 └──────────────────────────────────────────────────────────────────────────────┘

  Grade pill colors:
  91 → bg: #DCFCE7, text: #15803D   (A)
  78 → bg: #DBEAFE, text: #1D4ED8   (B)
  45 → bg: #FEE2E2, text: #B91C1C   (F) + row subtle red tint
  Click on grade → inline edit: input appears with teal focus ring
```

---

## 2.5 קומפוננטים

### Button
```css
.btn-primary {
  background: var(--sy-primary);
  color: #FFFFFF;
  font-family: var(--sy-font);
  font-weight: 600;
  font-size: var(--sy-text-base);
  padding: 0.625rem 1.5rem;
  border-radius: var(--sy-radius-md);
  border: none;
  transition: all 180ms ease;
}
.btn-primary:hover {
  background: var(--sy-primary-light);
  box-shadow: var(--sy-shadow-teal);
  transform: translateY(-1px);
}

.btn-cta {
  background: var(--sy-accent);
  color: #FFFFFF;
  font-weight: 700;
}
.btn-cta:hover { background: var(--sy-accent-light); }

.btn-ghost {
  background: transparent;
  color: var(--sy-primary-text);
  border: 2px solid var(--sy-border);
}
.btn-ghost:hover { border-color: var(--sy-primary); background: var(--sy-primary-pale); }
```

### Card
```css
.card {
  background: var(--sy-bg-surface);
  border: 1px solid var(--sy-border);
  border-radius: var(--sy-radius-xl);
  padding: var(--sy-space-6);
  box-shadow: var(--sy-shadow-md);
}
/* Warning card */
.card-warning {
  background: var(--sy-accent-pale);
  border-color: rgba(234,88,12,0.25);
}
/* Success card */
.card-success {
  background: var(--sy-success-pale);
  border-color: rgba(22,163,74,0.25);
}
```

### Input
```css
.input {
  background: #FFFFFF;
  border: 1.5px solid var(--sy-border);
  border-radius: var(--sy-radius-md);
  padding: 0.625rem 0.875rem;
  font-family: var(--sy-font);
  font-size: var(--sy-text-base);
  color: var(--sy-text-primary);
  width: 100%;
  transition: border-color 150ms, box-shadow 150ms;
}
.input:focus {
  outline: none;
  border-color: var(--sy-border-focus);
  box-shadow: 0 0 0 3px rgba(13,148,136,0.15);
}
.input::placeholder { color: var(--sy-text-muted); }
```

---

## 2.6 אנימציות

```css
/* Gentle, purposeful motion */

/* Card entrance (stagger on load) */
@keyframes cardSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card { animation: cardSlideUp 250ms ease-out both; }
.card:nth-child(2) { animation-delay: 60ms; }
.card:nth-child(3) { animation-delay: 120ms; }

/* Grade cell save confirmation */
@keyframes gradeConfirm {
  0%   { background: var(--sy-primary-pale); }
  80%  { background: var(--sy-primary-pale); }
  100% { background: transparent; }
}

/* Success checkmark */
@keyframes checkPop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

/* Empty state illustration bounce */
@keyframes gentleBounce {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
.empty-state-icon { animation: gentleBounce 3s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 50ms !important; }
}
```

---

## 2.7 Accessibility

- **Contrast**: Primary `#0D9488` על `#FFFFFF` = 4.7:1 (AA). Accent `#EA580C` על white = 4.5:1 (AA).
- **Grade badges**: תמיד הצג מספר — אל תסתמך רק על צבע. הוסף `aria-label="ציון 91 — מצוין"`.
- **Focus states**: `outline: 2px solid #0D9488` + `outline-offset: 2px`. Visible on cream background.
- **Touch targets**: כל כפתור ≥ 44px גובה. Grade pills בגרידבוק — ≥ 40px עם padding מסביב.
- **Warning states**: ⚠ + צבע + טקסט. לא צבע בלבד.
- **Empty states**: הסבר ברור + CTA — "אין ציונים עדיין. [הוסף ציון ראשון →]"

---

## 2.8 מתי לבחור Schoolyard

✅ גם מורים חדשי טכנולוגיה ישתמשו במערכת  
✅ חשובה תחושת "ברוך הבא", לא מאיים  
✅ הורים ו/או תלמידים יצפו במסכים  
✅ בית ספר רוצה תדמית חמה ומקצועית כאחד  
❌ לא מתאים לצפייה בכמות גדולה מאוד של נתונים בו-זמנית

---
---

# קונספט 3 — ספר לימוד (Editorial Grid)

> **תגית:** _"כל ציון — עובדה. כל עמוד — הצהרה."_

**ויז'ן:** עיתון פיננסי פגש מערכת SaaS. הכל קריא, הכל ישיר. Typography היא העיצוב. אין קישוטים — רק מידע חד. מי שרואה את המסך מבין מיד מה חשוב.

---

## 3.1 פלטת צבעים

```css
/* ─── Editorial Grid Color System ─── */
:root {
  /* Backgrounds — ניקיון מוחלט */
  --eg-bg-base:       #FFFFFF;   /* Pure white */
  --eg-bg-surface:    #F4F4F5;   /* Zinc-100 — secondary surfaces */
  --eg-bg-elevated:   #FAFAFA;   /* Hover bg, inactive */
  --eg-bg-ink:        #09090B;   /* Ink black — inverted sections */

  /* Primary — Electric Blue */
  --eg-primary:       #2563EB;   /* Blue-600 */
  --eg-primary-dark:  #1D4ED8;   /* Blue-700 — hover */
  --eg-primary-pale:  #DBEAFE;   /* Blue-100 — tint */
  --eg-primary-text:  #1E40AF;   /* Blue-800 — text on white */

  /* Text */
  --eg-text-primary:  #09090B;   /* Ink black */
  --eg-text-secondary:#52525B;   /* Zinc-600 */
  --eg-text-muted:    #A1A1AA;   /* Zinc-400 */
  --eg-text-inverse:  #F4F4F5;   /* On ink bg */

  /* Borders — precise, architectural */
  --eg-border-thin:   #E4E4E7;   /* Zinc-200 */
  --eg-border-mid:    #A1A1AA;   /* Zinc-400 */
  --eg-border-strong: #09090B;   /* Ink black — dividers */
  --eg-border-accent: #2563EB;   /* Blue accent */

  /* Semantic */
  --eg-success:       #16A34A;
  --eg-warning:       #D97706;
  --eg-danger:        #DC2626;

  /* Grade system — bold, flat */
  --eg-grade-a:       #16A34A;
  --eg-grade-b:       #2563EB;
  --eg-grade-c:       #D97706;
  --eg-grade-d:       #EA580C;
  --eg-grade-f:       #DC2626;
}
```

| תפקיד | צבע | Hex | שימוש |
|-------|-----|-----|-------|
| Base | ████ | `#FFFFFF` | כל הדף |
| Ink | ████ | `#09090B` | טקסט ראשי, dividers, sidebar bg |
| Primary | ████ | `#2563EB` | links, active, primary btn |
| Surface | ████ | `#F4F4F5` | secondary areas, table headers |
| Text secondary | ████ | `#52525B` | subtext, labels |

**כלל:** אין gradients. אין shadows. עומק = border בלבד.

---

## 3.2 טיפוגרפיה

```css
/*
  Display: Frank Ruhl Libre — Hebrew serif with gravitas (The Economist of Hebrew fonts)
  UI:      Heebo — clean, neutral, full Hebrew support
  Mono:    JetBrains Mono — numbers, codes, grades
*/
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500;700;900&family=Heebo:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --eg-font-display: 'Frank Ruhl Libre', 'David Libre', serif;
  --eg-font-ui:      'Heebo', 'Noto Sans Hebrew', sans-serif;
  --eg-font-mono:    'JetBrains Mono', monospace;

  /* Type scale — strict editorial */
  --eg-text-xs:      0.6875rem;  /* 11px — captions, labels uppercase */
  --eg-text-sm:      0.8125rem;  /* 13px — table data */
  --eg-text-base:    1rem;       /* 16px — body */
  --eg-text-lg:      1.125rem;   /* 18px — card titles */
  --eg-text-xl:      1.375rem;   /* 22px — section headers */
  --eg-text-2xl:     1.75rem;    /* 28px — page titles */
  --eg-text-3xl:     2.25rem;    /* 36px — big numbers */
  --eg-text-hero:    clamp(2.5rem, 5vw, 4rem);  /* Hero display */

  /* Leading & tracking */
  --eg-leading-tight:  1.1;
  --eg-leading-normal: 1.5;
  --eg-leading-loose:  1.75;
  --eg-tracking-caps:  0.08em;  /* uppercase labels */
}
```

**שימושים:**
- Page title, hero stats → `font-family: var(--eg-font-display); font-weight: 700–900`
- Body, nav, form labels → `font-family: var(--eg-font-ui); font-weight: 400–500`
- All numbers (grades, counts) → `font-family: var(--eg-font-mono); font-feature-settings: "tnum"`

---

## 3.3 Spacing & Borders

```css
:root {
  /* Spacing — generous vertical rhythm */
  --eg-space-1:   0.25rem;
  --eg-space-2:   0.5rem;
  --eg-space-3:   0.75rem;
  --eg-space-4:   1rem;
  --eg-space-6:   1.5rem;
  --eg-space-8:   2rem;
  --eg-space-10:  2.5rem;
  --eg-space-12:  3rem;
  --eg-space-16:  4rem;
  --eg-space-24:  6rem;

  /* NO border-radius (except inputs: 2px max) */
  --eg-radius-input: 0.125rem;  /* 2px — barely there */

  /* NO box-shadows — depth through borders only */

  /* Border weights */
  --eg-border-1: 1px solid var(--eg-border-thin);
  --eg-border-2: 2px solid var(--eg-border-strong);
  --eg-border-4: 4px solid var(--eg-border-strong);
  --eg-border-accent-4: 4px solid var(--eg-primary);

  /* Layout */
  --eg-sidebar-width: 220px;
  --eg-topbar-height: 48px;
  --eg-content-max:   1440px;

  /* Transitions — swift, no bounce */
  --eg-transition-fast: 100ms ease;
  --eg-transition-base: 180ms ease;
}
```

---

## 3.4 מסכי מפתח — ASCII Mockups

### מסך 1: Login — Split Layout

```
╔═══════════════════════════════╦════════════════════════════════════════════╗
║                               ║                                            ║  vertical split
║  bg: #09090B                  ║  bg: #FFFFFF                               ║
║                               ║                                            ║
║                               ║  SCHOOL                                    ║  label: 11px uppercase
║  מערכת                         ║  GRADEBOOK                                 ║  tracking-widest
║  ניהול                         ║  ─────────────                              ║  color: #A1A1AA
║  ציונות                        ║                                            ║
║  ————————————                 ║  ────────────────────────────────────────  ║  4px border-top: blue
║  SCHOOL GRADEBOOK             ║                                            ║
║  v2.4.1                       ║  כניסה למערכת                              ║  text-2xl, Frank Ruhl
║                               ║                                            ║  font-weight: 700
║  ————————————————————         ║                                            ║
║  "כל נתון —                   ║  כתובת מייל                                ║  label: 13px, Heebo 500
║   בידיים שלך"                 ║  ┌──────────────────────────────────────┐  ║  uppercase, #52525B
║                               ║  │ admin@school.co.il                   │  ║  input: radius 2px
║                               ║  └──────────────────────────────────────┘  ║  border: 1px #E4E4E7
║                               ║                                            ║  focus: border-2 #2563EB
║                               ║  סיסמה                                     ║  left border-4: blue
║  ————————————————————         ║  ┌──────────────────────────────────────┐  ║
║  ● מנהל בית ספר               ║  │ ••••••••••••                  [👁]   │  ║
║  ○ מנהל על                    ║  └──────────────────────────────────────┘  ║  role: left panel
║  ○ מורה                       ║                                            ║  toggle: text links
║                               ║  ┌──────────────────────────────────────┐  ║
║                               ║  │           כניסה ←                   │  ║  btn: bg #09090B
║                               ║  └──────────────────────────────────────┘  ║  text: white, no radius
║                               ║                                            ║  hover: bg #2563EB
║                               ║  שכחתי סיסמה                              ║  link: #2563EB underline
╚═══════════════════════════════╩════════════════════════════════════════════╝
           45%                                  55%
```

---

### מסך 2: Dashboard (Admin)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ════════════════════════════════════════════════════════════════════════════│  topbar: white
│  מערכת ניהול בית ספר     ╱  לוח בקרה                  [🔔] [admin]       │  border-b: 4px #09090B
│ ════════════════════════════════════════════════════════════════════════════│
├────────────┬───────────────────────────────────────────────────────────────┤
│  bg:#09090B│                                                                │  sidebar: ink black
│            │  ┌────────────────────────────────────────────────────────┐   │
│  לוח בקרה  │  │  ████████████████ 483 ████████████  31 ██████████ 18  │   │  KPI strip
│  ─────────  │  │  תלמידים             מורים             כיתות          │   │  bg: #F4F4F5
│  כיתות     │  │  ████████████████ ─────────────── ───────────────     │   │  border-b: 2px #09090B
│  תלמידים   │  │  +12 החודש           פעילים             פעילות        │   │  numbers: text-3xl
│  מקצועות   │  └────────────────────────────────────────────────────────┘   │  Frank Ruhl 700
│  ─────────  │                                                                │
│  ציונים     │  ════════════════════════════════════════════════════════     │  section divider: 2px
│  תעודות     │  כיתות פעילות                                                 │  title: text-xl, Heebo 700
│  ─────────  │  ════════════════════════════════════════════════════════     │
│  משתמשים   │                                                                │
│  הגדרות    │  ז'1        ██████████████░░░░  78%    24 תלמידים   →        │  row layout
│  ─────────  │  ────────────────────────────────────────────────────────     │  border-b: 1px thin
│  [יציאה ←] │  ח'2        ██████████░░░░░░░░  61%    22 תלמידים   →        │  progress: bg blue
│  (white tx) │  ────────────────────────────────────────────────────────     │  hover row: bg #F4F4F5
│            │  ט'3        ████████████████░░  92%    26 תלמידים   →        │
│            │  ════════════════════════════════════════════════════════     │
└────────────┴───────────────────────────────────────────────────────────────┘
sidebar nav items: text white/60 inactive, text white active + border-r 4px #2563EB
```

---

### מסך 3: Gradebook Grid

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ════════════════════════════════════════════════════════════════════════════════│
│  ← בחזרה     ז'1  /  תקופה ב'                        [נעול ✓]  [הפק תעודות] │  breadcrumb: Heebo 13px
│ ════════════════════════════════════════════════════════════════════════════════│  4px top border blue
├────────────────────────────────────────────────────────────────────────────────┤
│  [🔍 חפש...]    [מקצוע ▼]    [מיין ▼]    [ייצא ↓]    ∑ 24    ⌀ 78.4         │  toolbar: Heebo sm
├────────────────┬───────────┬───────────┬──────────┬──────────┬───────────────┤  header: bg #F4F4F5
│  שם תלמיד      │ מתמטיקה   │ אנגלית    │ עברית    │ מדעים    │ ממוצע         │  border-b: 2px #09090B
│  ══════════════════════════════════════════════════════════════════════════   │  Frank Ruhl 500
│  אברהם כהן     │    91     │    84     │    88    │    95    │    89.5       │  grade: JetBrains Mono
│  ──────────────────────────────────────────────────────────────────────────   │  color: green/blue/etc
│  שרה לוי        │    78     │    92     │    71    │    85    │    81.5       │  row hover: bg #FAFAFA
│  ──────────────────────────────────────────────────────────────────────────   │  border-b: 1px thin
│  דוד גולד       │    45     │    61     │    52    │    58    │    54.0       │  low avg: left border
│  ══════════════════════════════════════════════════════════════════════════   │  4px #DC2626
│  ─  ─  ─  ─    │           │           │          │          │               │
│  ⌀ ממוצע       │   78.6    │   82.3    │   76.9   │   81.4   │   79.8       │  footer: bg #F4F4F5
├────────────────────────────────────────────────────────────────────────────────┤  border-t: 2px #09090B
│  ████ A (90–100) = #16A34A    ████ B (80–89) = #2563EB    ████ C = #D97706  │  legend row
│  ████ D (60–69) = #EA580C     ████ F (<60) = #DC2626                         │
└────────────────────────────────────────────────────────────────────────────────┘

  Grade cell click → inline input, 2px border-left: 4px #2563EB, no radius
  Save → instant, 100ms, no animation — just value update
  Missing grade → "—" color #A1A1AA, italic
```

---

## 3.5 קומפוננטים

### Button
```css
/* Primary — Ink black */
.btn-primary {
  background: var(--eg-text-primary);
  color: #FFFFFF;
  font-family: var(--eg-font-ui);
  font-weight: 600;
  font-size: var(--eg-text-sm);
  letter-spacing: 0.02em;
  padding: 0.5rem 1.25rem;
  border: 2px solid var(--eg-text-primary);
  border-radius: var(--eg-radius-input);
  transition: all var(--eg-transition-fast);
  text-transform: uppercase;
}
.btn-primary:hover {
  background: var(--eg-primary);
  border-color: var(--eg-primary);
}

/* Secondary — outline */
.btn-secondary {
  background: transparent;
  color: var(--eg-text-primary);
  border: 2px solid var(--eg-border-strong);
}
.btn-secondary:hover {
  border-color: var(--eg-primary);
  color: var(--eg-primary);
}

/* Danger */
.btn-danger {
  background: var(--eg-danger);
  color: white;
  border-color: var(--eg-danger);
}
```

### Card
```css
.card {
  background: #FFFFFF;
  border: 1px solid var(--eg-border-thin);
  border-top: 4px solid var(--eg-border-strong);  /* architectural accent */
  border-radius: 0;  /* NO radius */
  padding: var(--eg-space-6);
}
/* Blue top — primary KPI */
.card-primary { border-top-color: var(--eg-primary); }
/* Warning */
.card-warning { border-top-color: var(--eg-warning); }
/* Danger */
.card-danger { border-top-color: var(--eg-danger); }

/* Hover: left accent shift */
.card-interactive:hover {
  border-top-color: var(--eg-primary);
  transition: border-top-color var(--eg-transition-fast);
}
```

### Table
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--eg-font-ui);
}
.data-table th {
  background: var(--eg-bg-surface);
  font-size: var(--eg-text-xs);
  font-weight: 600;
  letter-spacing: var(--eg-tracking-caps);
  text-transform: uppercase;
  color: var(--eg-text-secondary);
  padding: var(--eg-space-3) var(--eg-space-4);
  border-bottom: 2px solid var(--eg-border-strong);
  text-align: right;  /* RTL */
}
.data-table td {
  padding: var(--eg-space-3) var(--eg-space-4);
  border-bottom: var(--eg-border-1);
  font-size: var(--eg-text-sm);
  color: var(--eg-text-primary);
  vertical-align: middle;
}
.data-table tr:hover td { background: var(--eg-bg-elevated); }

/* Grade numbers */
.data-table td.grade {
  font-family: var(--eg-font-mono);
  font-size: var(--eg-text-base);
  font-weight: 500;
  text-align: center;
  font-feature-settings: "tnum";
}
```

### Section Divider
```css
.section-title {
  font-family: var(--eg-font-ui);
  font-size: var(--eg-text-xs);
  font-weight: 700;
  letter-spacing: var(--eg-tracking-caps);
  text-transform: uppercase;
  color: var(--eg-text-secondary);
  padding-bottom: var(--eg-space-3);
  border-bottom: 2px solid var(--eg-border-strong);
  margin-bottom: var(--eg-space-6);
}
```

---

## 3.6 אנימציות

```css
/* Minimal — editorial does not animate frivolously */

/* Page transition: instant content swap */
.page-enter {
  opacity: 0;
  transform: translateY(4px);
  animation: pageIn 150ms ease-out forwards;
}
@keyframes pageIn {
  to { opacity: 1; transform: translateY(0); }
}

/* Table row highlight (after save) */
@keyframes rowFlash {
  0%   { background: var(--eg-primary-pale); }
  100% { background: transparent; }
}
.row-saved { animation: rowFlash 800ms ease-out forwards; }

/* Button active press */
.btn-primary:active { transform: scale(0.98); }

/* Progress bar fill */
@keyframes progressFill {
  from { width: 0%; }
}
.progress-bar { animation: progressFill 400ms ease-out both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

---

## 3.7 Accessibility

- **Contrast**: Ink black `#09090B` על white = 21:1. Primary blue `#2563EB` על white = 5.9:1. כל האלמנטים עומדים ב-WCAG AAA.
- **Focus**: `outline: 3px solid #2563EB; outline-offset: 2px` — גלוי מאוד על white background.
- **No shadows**: עומק מגיע מ-borders בלבד — עובד גם ב-high contrast mode.
- **Grade numbers**: color + מספר תמיד. הוסף `aria-label="ציון 91 — ממוצע גבוה"`.
- **Table**: `role="grid"`, `aria-sort` על columns ניתנים למיון, `scope="col"` על headers.
- **Sidebar inverse**: text לבן על שחור — ודא contrast ≥ 7:1 (`#FFFFFF`/`#09090B` = 21:1 ✓).
- **Uppercase labels**: font-size ≥ 11px + letter-spacing — קריא גם בגדלי גופן גדולים.

---

## 3.8 מתי לבחור Editorial Grid

✅ מנהלים שרוצים לחוש "עיסקיות" ורצינות  
✅ נתונים הם הכוכב — לא הממשק  
✅ Print & export של תעודות/ציונים חשוב (no-shadow = print-friendly)  
✅ Accessibility הוא עדיפות עליונה  
❌ לא מתאים אם רוצים תחושה "חמה" ומזמינה  
❌ לא מתאים למשתמשים שמצפים לממשק צבעוני ומודרני

---
---

# טבלת השוואה מהירה

| קריטריון | Command Center | Schoolyard | Editorial Grid |
|-----------|---------------|------------|----------------|
| **מצב** | Dark only | Light | Light |
| **טון** | מקצועי-טכני | חם-ידידותי | עסקי-רציני |
| **צפיפות** | גבוהה מאוד | בינונית | גבוהה |
| **קהל יעד** | Admin/IT | Teachers/Admin | All roles |
| **הורים/תלמידים** | לא מומלץ | מומלץ | אפשרי |
| **Print friendly** | לא | חלקית | כן |
| **A11y** | AA | AA | AAA |
| **עומס פיתוח** | בינוני | נמוך | נמוך |
| **Google Fonts** | Heebo + JetBrains Mono | Rubik | Frank Ruhl Libre + Heebo + JetBrains Mono |

---

# Tailwind Config קצר לכל קונספט

```js
// tailwind.config.ts — הכנס לפי הקונספט שנבחר

// ── CONCEPT 1: Command Center ──────────────────────
colors: {
  cc: {
    bg:       '#0B1120',
    surface:  '#111827',
    elevated: '#1C2536',
    primary:  '#06B6D4',
    cta:      '#F59E0B',
    success:  '#10B981',
    danger:   '#F87171',
    text:     '#F1F5F9',
    muted:    '#94A3B8',
  }
}

// ── CONCEPT 2: Schoolyard ──────────────────────────
colors: {
  sy: {
    bg:      '#FEFCE8',
    surface: '#FFFFFF',
    primary: '#0D9488',
    accent:  '#EA580C',
    success: '#16A34A',
    danger:  '#DC2626',
    text:    '#1C1917',
    muted:   '#A8A29E',
  }
}

// ── CONCEPT 3: Editorial Grid ──────────────────────
colors: {
  eg: {
    bg:      '#FFFFFF',
    surface: '#F4F4F5',
    ink:     '#09090B',
    primary: '#2563EB',
    success: '#16A34A',
    danger:  '#DC2626',
    text:    '#09090B',
    muted:   '#A1A1AA',
  }
}
```

---

> **הערת יישום:** כל קונספט הוא עצמאי לחלוטין. אל תמזג ביניהם. בחר אחד — יישם אותו בעקביות מקצה לקצה.  
> פונט Hebrew: ודא ש-Google Fonts כולל את subset `hebrew` בקישור ה-import.
