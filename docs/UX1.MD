# UX1 — חמישה קונספטי עיצוב למערכת הציונים

> **Next.js 14 · Tailwind CSS 3.4 · RTL / `dir="rtl"` · `lang="he"`**
> כל קונספט עצמאי ומלא — palette, typography, CSS variables, רכיבי מפתח, אינטראקציות.

---

## תוכן עניינים

| # | שם | סגנון | מצב |
|---|-----|-------|------|
| 1 | [מרכז הפיקוד](#1-מרכז-הפיקוד) | Data-Dense Dark Dashboard | Dark |
| 2 | [גן הדעת](#2-גן-הדעת) | Bento Grid · Academic Warmth | Light |
| 3 | [יריעה שוויצרית](#3-יריעה-שוויצרית) | Swiss Modernism 2.0 | Light |
| 4 | [אוגוסט](#4-אוגוסט) | Luxury Glassmorphism Dark | Dark |
| 5 | [חצוף](#5-חצוף) | Neo-Brutalism | Light |

---

---

# 1 — מרכז הפיקוד

> **"כל נתון, בשניות. כל מורה, בשליטה."**
> *Control Room* — ממשק אנליטיקה כבד, שפת עיצוב של חדר מצב.

---

## ויז'ן

שפה ויזואלית של **terminal ו-BI dashboard** — כהה, צפוף, מדויק. הצבע היחיד שמאיר הוא
הנתון עצמו: ציון, סטטוס, התראה. שום קישוט, שום מילוי. מורה נפתח למסך ורואה בדיוק היכן
עומד הכיתה שלו.

---

## Palette

```
Background     #050A18   /* חלל עמוק */
Surface        #0D1526   /* כרטיסים */
Surface-2      #152035   /* hover / elevated */
Border         #1E3354   /* קו עדין */
Text-Primary   #E8EFF8   /* טקסט ראשי */
Text-Muted     #6B8BAF   /* תיוגים, labels */
Primary        #2563EB   /* כחול אמין */
Primary-Glow   rgba(37,99,235,0.18)
Accent-Amber   #D97706   /* ציוני גבול / אזהרה */
Success        #16A34A   /* עבר / תקין */
Danger         #DC2626   /* נכשל / נעול */
Data-1         #3B82F6   /* ממוצע כיתה */
Data-2         #8B5CF6   /* מגמה */
Data-3         #06B6D4   /* השוואה */
```

### CSS Variables (`:root`)

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

:root {
  --bg:           #050A18;
  --surface:      #0D1526;
  --surface-2:    #152035;
  --border:       #1E3354;
  --text:         #E8EFF8;
  --muted:        #6B8BAF;
  --primary:      #2563EB;
  --primary-glow: rgba(37,99,235,0.18);
  --amber:        #D97706;
  --success:      #16A34A;
  --danger:       #DC2626;
  --radius-sm:    6px;
  --radius-md:    10px;
  --radius-lg:    16px;
  --font-mono:    'Fira Code', monospace;
  --font-body:    'Fira Sans', sans-serif;
}
```

---

## Typography

| תפקיד | גופן | משקל | גודל | שימוש |
|--------|------|------|------|-------|
| Display | Fira Code | 600 | 28–36px | כותרות מסך, KPI גדולים |
| Heading | Fira Sans | 600 | 20–24px | כותרות כרטיסים |
| Body | Fira Sans | 400 | 14–16px | טקסט רץ |
| Label | Fira Sans | 500 | 12–13px | תוויות עמודות, meta |
| Data | Fira Code | 500 | 14–16px | ציונים, מספרים, timestamps |
| Micro | Fira Sans | 300 | 11px | footnotes, tooltips |

> **כלל אחד:** כל מספר שמשמעותי (ציון, אחוז, כמות) — `font-family: var(--font-mono)` עם `tabular-nums`.

---

## מבנה פריסה — Layout System

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR (220px, קבוע)  │        MAIN CONTENT AREA              │
│                          │  ┌────────────────────────────────┐  │
│  Logo + School Name      │  │  TOPBAR: breadcrumb + actions  │  │
│  ─────────────────────   │  └────────────────────────────────┘  │
│  ניווט ראשי:             │                                       │
│  • Dashboard             │  ┌──────────────────────────────────┐ │
│  • כיתות                 │  │  KPI ROW  (4 tiles × 1/4 width)  │ │
│  • ציונים                │  └──────────────────────────────────┘ │
│  • תעודות                │                                       │
│  • הגדרות                │  ┌─────────────────┐ ┌────────────┐  │
│  ─────────────────────   │  │ CHART 2/3       │ │ LIST 1/3   │  │
│  USER AVATAR + ROLE      │  └─────────────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Grid:** `grid-template-columns: 220px 1fr` · Content: `max-w-7xl` · Gap: `24px`
**Breakpoint collapse:** sidebar → `64px` icon-only מתחת ל-1024px

---

## מסכים

### 1.1 — Dashboard ראשי

**KPI Row (4 cards, 1/4 each):**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  ממוצע כיתה     │  │  תלמידים בסיכון │  │  תעודות מוכנות  │  │  מועד נעילה     │
│                 │  │                 │  │                 │  │                 │
│   84.3          │  │     7           │  │    23 / 32      │  │   6 ימים        │
│   ──────────    │  │   ▲ +2          │  │   ████████░░    │  │   ──────────    │
│   vs 81.1 ↑    │  │   vs שבוע       │  │   71.8%         │  │   12 ספט׳       │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Main Chart:** ממוצע ציונים לפי מקצוע — Line chart עם hover tooltip (`Recharts` / `Victory`)
**Side List:** תלמידים הדורשים תשומת לב — `border-right: 3px solid var(--danger)` על כל שורה

**Micro-interactions:**
- KPI card hover → `background: var(--surface-2)` + border-color: `var(--primary)` (150ms ease-out)
- Chart line hover → tooltip מתעורר עם `transform: translateY(-4px)` + `box-shadow: 0 8px 24px var(--primary-glow)`
- Row hover בטבלה → `background: var(--surface-2)` + cursor indicator

---

### 1.2 — הזנת ציונים (Grade Entry)

**Excel-style grid:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [כיתה ד׳1] [מתמטיקה] [סמסטר א׳]                    [ שמור ←  ] [ נעל 🔒 ]  │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────────┤
│ שם תלמיד │ מבחן 1   │ מבחן 2   │ עבודה    │ השתתפות  │ ממוצע    │ הערה       │
│          │ /100     │ /100     │ /30      │ /20      │          │            │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────────┤
│ דן לוי   │ [  85  ] │ [  92  ] │ [  27  ] │ [  18  ] │  87.2 ★  │ [ + ]      │
│ נועה כץ  │ [  78  ] │ [  ▌   ] │ [  25  ] │ [  16  ] │  ...     │ [ + ]      │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────────┘
```

**תא מוקד:** border `2px solid var(--primary)` + `background: rgba(37,99,235,0.12)` + auto-select content
**ניווט:** `Tab` → עמודה הבאה, `Enter` → שורה הבאה, `Esc` → ביטול ערך, `Ctrl+S` → שמירה
**צבע ציון בזמן אמת:**
- `≥ 60` → `color: var(--success)`
- `40–59` → `color: var(--amber)`
- `< 40` → `color: var(--danger)` + רקע `rgba(220,38,38,0.08)`
- **Auto-calc ממוצע** עם `debounce(300ms)` תוך כדי הקלדה

**Toast שמירה:** bottom-right, 4s auto-dismiss, `background: var(--surface-2)`, checkmark animation

---

### 1.3 — הפקת תעודה

**Split view:**

```
┌────────────────────────────────────┬──────────────────────────────────────────┐
│  SETTINGS PANEL (360px)            │  LIVE PREVIEW                            │
│                                    │                                          │
│  תלמיד: [dropdown ▼]               │  ┌──────────────────────────────────┐    │
│  תבנית: [dropdown ▼]               │  │                                  │    │
│  שנה:   [2024–2025 ▼]              │  │  [תעודה מינימליסטית — preview]   │    │
│                                    │  │                                  │    │
│  ──────────────────────────────    │  └──────────────────────────────────┘    │
│  חתימת מנהל:                       │                                          │
│  [Upload] / [Draw]                 │  [ הורד PDF ↓ ]  [ שלח למייל ✉ ]        │
│                                    │                                          │
│  כולל הערת מחנך: [toggle]          │                                          │
└────────────────────────────────────┴──────────────────────────────────────────┘
```

**Preview:** iframe עם shadow-dom תבנית PDF, refresh בכל שינוי (debounce 500ms)

---

### 1.4 — רשימת תלמידים

**Data table עם sorting/filtering:**

```
[ 🔍 חיפוש... ]  [ כיתה ▼ ]  [ סטטוס ▼ ]  [ ייצא CSV ]

┌────┬──────────────────┬──────┬────────────┬──────────┬──────────────┐
│    │ שם               │ כיתה │ ממוצע כללי │ תעודה    │ פעולות       │
├────┼──────────────────┼──────┼────────────┼──────────┼──────────────┤
│ ◉  │ אביב כהן         │ ד׳1  │ 91.4 ↑     │ ✓ מוכן   │ [👁] [✏️]   │
│ ◉  │ בת-אל שמש        │ ד׳2  │ 73.8       │ ⏳ חסר   │ [👁] [✏️]   │
│ ◉  │ גיא מזרחי        │ ה׳1  │ 58.2 ↓     │ ✗ חסר    │ [👁] [✏️]   │
└────┴──────────────────┴──────┴────────────┴──────────┴──────────────┘
```

**Row click** → drawer נפתח מימין עם פרופיל מלא של תלמיד (גרף ציונים ב-6 חודשים + פרטים)

---

### 1.5 — הגדרות בית ספר

```
[ ← חזרה ]  הגדרות בית ספר — בית ספר אורות

TABS: פרטי בית הספר | מקצועות | מערכות ציונים | משתמשים | הרשאות

┌──────────────────────────────────────────────────────────────────────────┐
│  [tab פעיל: מערכות ציונים]                                               │
│                                                                           │
│  סוגי מערכות קיימות:                                                     │
│                                                                           │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐     │
│  │  מספרי 0-100      │  │  A-F              │  │  + הוסף חדשה      │     │
│  │  ● 4 כיתות        │  │  ● 2 כיתות        │  │                   │     │
│  │  [ ערוך ] [ מחק ] │  │  [ ערוך ] [ מחק ] │  │                   │     │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Design Tokens — סיכום מהיר

```css
/* Spacing scale: 4px base */
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-6: 24px; --space-8: 32px;

/* Shadows */
--shadow-card:  0 2px 8px rgba(0,0,0,0.4);
--shadow-hover: 0 4px 20px rgba(37,99,235,0.25);

/* Transitions */
--t-fast:   150ms ease-out;
--t-normal: 250ms ease-out;
--t-slow:   400ms cubic-bezier(0.16,1,0.3,1);
```

---

---

# 2 — גן הדעת

> **"בית ספר שמרגיש כמו בית."**
> *Garden of Knowledge* — Bento Grid חמים ואקדמי, בהשראת Apple + בתי ספר סקנדינביים.

---

## ויז'ן

כרטיסים מעוגלים בגדלים שונים על רקע שמנת עדין. צבעים אורגניים — ירוק יער, זהב חם, חרדל.
פונטים עם אופי — serif לכותרות, rounded sans לגוף. המשתמש מרגיש **מוזמן**, לא מוצף.

---

## Palette

```
Background     #F7F4EE   /* שמנת חמה */
Surface        #FFFFFF
Surface-Tint   #F0EBE1   /* רקע hover */
Border         #E5DDD0
Text-Primary   #1A1207   /* כמעט שחור חם */
Text-Muted     #7A6A54   /* חום בינוני */
Primary        #2D6A4F   /* ירוק יער */
Primary-Light  #D8F3DC   /* רקע primary כהה */
Accent         #B5811A   /* זהב אקדמי */
Accent-Light   #FDF3DC   /* רקע accent */
Coral          #C84B31   /* אזהרה / danger */
Coral-Light    #FDEEEA
Slate          #4A5568   /* neutral mid */
```

### CSS Variables

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Nunito:wght@400;500;600;700&display=swap');

:root {
  --bg:           #F7F4EE;
  --surface:      #FFFFFF;
  --surface-tint: #F0EBE1;
  --border:       #E5DDD0;
  --text:         #1A1207;
  --muted:        #7A6A54;
  --primary:      #2D6A4F;
  --primary-lt:   #D8F3DC;
  --accent:       #B5811A;
  --accent-lt:    #FDF3DC;
  --coral:        #C84B31;
  --coral-lt:     #FDEEEA;
  --radius-sm:    10px;
  --radius-md:    18px;
  --radius-lg:    28px;
  --radius-xl:    36px;
  --font-display: 'Playfair Display', serif;
  --font-body:    'Nunito', sans-serif;
}
```

---

## Typography

| תפקיד | גופן | משקל | גודל | מאפיין |
|--------|------|------|------|---------|
| Hero / KPI | Playfair Display | 700 | 42–56px | `letter-spacing: -0.02em` |
| Heading | Playfair Display | 600 | 22–28px | |
| Sub-heading | Nunito | 700 | 17–20px | `letter-spacing: -0.01em` |
| Body | Nunito | 400 | 15–16px | `line-height: 1.65` |
| Label | Nunito | 600 | 12–13px | `text-transform: uppercase; letter-spacing: 0.06em` |
| Caption | Nunito | 400 | 12px | |

---

## Bento Grid System

```
grid-template-columns: repeat(12, 1fr)
gap: 20px
max-width: 1280px

Card sizes:
  Small  (span 3)  — stat tile
  Medium (span 4)  — list / mini chart
  Large  (span 6)  — main chart / grade table
  Hero   (span 8)  — feature card
  Full   (span 12) — full-width section
```

**כללי bento:**
- `border-radius: var(--radius-lg)` על כל כרטיס
- `box-shadow: 0 2px 12px rgba(26,18,7,0.07)` — צל חם ועדין
- Hover: `transform: translateY(-2px)` + `box-shadow: 0 8px 28px rgba(26,18,7,0.12)` (200ms ease)
- כל כרטיס — `padding: 24px`

---

## מסכים

### 2.1 — Dashboard ראשי

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  TOPBAR: [🌿 שם בית ספר]  ──────────────────────  [פעמון] [אווטר] [שם מורה]    │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌────────────────────────────────────────────┐  ┌──────────────────────────┐    │
│  │  HERO CARD (span 8)                        │  │  stat (span 4)           │    │
│  │                                            │  │                          │    │
│  │  "שלום, מורה מיכל 🌿"                      │  │  📊 ממוצע הכיתה          │    │
│  │  כיתה ד׳1 — 32 תלמידים                     │  │                          │    │
│  │                                            │  │   84.3                   │    │
│  │  ████████████████░░░░  71% תעודות מוכנות   │  │                          │    │
│  │  [ המשך לתעודות → ]                        │  │  ↑ 3.2 מהסמסטר הקודם     │    │
│  └────────────────────────────────────────────┘  └──────────────────────────┘    │
│                                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ stat (span 3)│  │ stat (span 3)│  │ stat (span 3)│  │ list (span 3)        │  │
│  │              │  │              │  │              │  │                      │  │
│  │  7 בסיכון    │  │  6 ימים      │  │  3 ממתינים   │  │  פעולות אחרונות      │  │
│  │  🔴          │  │  לנעילה      │  │  לאישור      │  │  ─────────────────   │  │
│  │              │  │  ⏳           │  │  📋           │  │  • ציון נוסף...     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                                   │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────────┐    │
│  │  ממוצע לפי מקצוע (span 6)               │  │  תלמידים בסיכון (span 6)   │    │
│  │  [Bar Chart חמים, ירוק + זהב]            │  │  [כרטיסוני תלמידים קטנים]  │    │
│  └──────────────────────────────────────────┘  └────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Bottom nav (mobile):** Home · ציונים · תעודות · הגדרות — icons + labels, `background: var(--surface)`, גובה 64px

---

### 2.2 — הזנת ציונים

**Sticky toolbar:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ← כיתה ד׳1  /  מתמטיקה  /  סמסטר א׳              [💾 שמור]  [🔒] │
└─────────────────────────────────────────────────────────────────────┘
```

**Grade cards layout (במקום טבלה רגילה):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ─────────────────────────────────────────────────────────────────────────  │
│  [ 🔍 חיפוש תלמיד... ]  [ סדר: שם ▼ ]                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌───────────────────────────────────────────┐  ┌─────────────────────────┐ │
│  │ דן לוי    ●●●●●●●●●●  ממוצע: 87.2        │  │  נועה כץ    ●●●●●●●○○○  │ │
│  │ ──────────────────────────────────────    │  │  ממוצע: 62.0  ⚠         │ │
│  │ מבחן 1: [85] · מבחן 2: [92] · עבודה: [27]│  │  [ פתח לעריכה ]         │ │
│  │ [ שמור ]                                  │  └─────────────────────────┘ │
│  └───────────────────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Input fields:** `border-radius: 12px` · focus `border: 2px solid var(--primary)` · background `var(--primary-lt)` בזמן עריכה

---

### 2.3 — הפקת תעודה

תצוגת **Step Wizard** (3 שלבים):

```
  [① בחר תלמיד]  ───●───  [② תבנית ועיצוב]  ─────  [③ הורד / שלח]

  ─────────────────────────────────────────────────────────────────────
  שלב ② — תבנית ועיצוב

  ┌─────────────────────────────┐    ┌───────────────────────────────────┐
  │  בחר תבנית:                 │    │  PREVIEW                          │
  │                             │    │                                   │
  │  [🌿 ירוק קלאסי]  ← נבחר   │    │  ┌───────────────────────────┐   │
  │  [📜 פורמלי]               │    │  │                           │   │
  │  [🎓 בוגרים]               │    │  │  [תעודה מינימלית]         │   │
  │                             │    │  │                           │   │
  │  כולל הערת מחנך: [✓]        │    │  └───────────────────────────┘   │
  └─────────────────────────────┘    └───────────────────────────────────┘
```

---

### 2.4 — רשימת תלמידים

```
  ┌────────────────────────────────────────────────────────────────────┐
  │  [ 🔍 ]  [ כיתה ▼ ]  [ סטטוס ▼ ]                   [ + הוסף ]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                     │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  [אווטר] אביב כהן         ד׳1    91.4 ↑   ✓ תעודה מוכנה   │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  [אווטר] בת-אל שמש        ד׳2    73.8      ⏳ חסרים ציונים  │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  [אווטר] גיא מזרחי         ה׳1    58.2 ↓   ⚠ בסיכון        │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  └────────────────────────────────────────────────────────────────────┘
```

Row = `border-radius: 16px` + `background: var(--surface)` + shadow עדין
Hover → border `2px solid var(--primary)` + `background: var(--primary-lt)`

---

### 2.5 — הגדרות בית ספר

```
  SIDEBAR TABS (vertical):
  • 🏫 פרטי בית ספר  ← נבחר
  • 📚 מקצועות
  • 📊 מערכות ציונים
  • 👥 משתמשים
  • 🔐 הרשאות

  CONTENT AREA (bento cards):
  ┌──────────────────────┐  ┌──────────────────────────────────────┐
  │  פרטי בית הספר       │  │  לוגו                                │
  │  ─────────────────   │  │  ──────────────────────────────────  │
  │  שם: [_____________] │  │  [גרור קובץ כאן או לחץ להעלאה]      │
  │  עיר: [_____________] │  │                                      │
  │  טלפון: [__________] │  └──────────────────────────────────────┘
  │  [ שמור שינויים ]    │
  └──────────────────────┘
```

---

---

# 3 — יריעה שוויצרית

> **"הפשטות היא הסובלנות הגבוהה ביותר."**
> *Swiss Canvas* — Swiss Modernism 2.0, 12-col grid, היררכיה טיפוגרפית מוחלטת.

---

## ויז'ן

שחור ולבן בלבד, עם **אקסנט אחד בלבד** — ירוק בוקר (`#0A7163`). גריד של 12 עמודות, מרווחים מתמטיים.
כל אלמנט מוצדק רציונלית. אין עיטורים. הטיפוגרפיה **היא** העיצוב.

---

## Palette

```
Background     #FFFFFF
Surface        #F8F8F7
Surface-Alt    #F0EFF0
Border         #E2E2E2
Border-Strong  #C8C8C8
Text-Primary   #0D0D0D
Text-Secondary #4A4A4A
Text-Muted     #8A8A8A
Accent         #0A7163   /* ירוק בוקר — אקסנט יחיד */
Accent-Light   rgba(10,113,99,0.08)
Danger         #D32F2F
Danger-Light   #FEF2F2
```

### CSS Variables

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&display=swap');

:root {
  --bg:         #FFFFFF;
  --surface:    #F8F8F7;
  --border:     #E2E2E2;
  --text:       #0D0D0D;
  --muted:      #8A8A8A;
  --accent:     #0A7163;
  --accent-lt:  rgba(10,113,99,0.08);
  --danger:     #D32F2F;
  --radius:     0px;   /* Swiss — אין radius */
  --font-serif: 'DM Serif Display', serif;
  --font-sans:  'DM Sans', sans-serif;
  --grid-cols:  12;
  --grid-gap:   24px;
  --base:       8px;
}
```

---

## Typography Scale

| תפקיד | גופן | משקל | גודל | שורה |
|--------|------|------|------|------|
| Display | DM Serif Display | 400 | 56–72px | 1.1 |
| H1 | DM Serif Display | 400 | 36–42px | 1.15 |
| H2 | DM Sans | 700 | 24–28px | 1.2 |
| H3 | DM Sans | 700 | 18–20px | 1.3 |
| Body | DM Sans | 400 | 15–16px | 1.6 |
| Label | DM Sans | 500 | 11–12px | 1 | `text-transform: uppercase; letter-spacing: 0.1em` |
| Data | DM Sans | 700 | 14–16px | 1 | `font-variant-numeric: tabular-nums` |
| Caption | DM Sans | 400 | 12px | 1.5 |

**כלל ברזל:** `border-radius: 0` בכל מקום. אפס. לא 2px, לא 4px. אפס.

---

## Layout Principles

```
12-column grid, gap 24px, max-width 1440px
Section rhythm: 64px בין sections
Component gap: 32px
Internal padding: 24px (cards), 16px (compact)

Sidebar: 280px fixed | Content: fluid
Dividers: 1px solid var(--border), no ornament
```

---

## מסכים

### 3.1 — Dashboard ראשי

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [LOGO]  בית ספר אורות                              [מחנך] [שנה"ל] [צא]   │
│  ─────────────────────────────────────────────────────────────────────     │
│  LABEL SMALL: "סקירת מצב — ד׳1 — ספטמבר 2025"                            │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────────┐  │
│  │  84.3              │ │  7                 │ │  71%                   │  │
│  │  ─────────────     │ │  ─────────────     │ │  ─────────────         │  │
│  │  ממוצע כיתה        │ │  תלמידים בסיכון    │ │  תעודות שהושלמו        │  │
│  └────────────────────┘ └────────────────────┘ └────────────────────────┘  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│  H2: ממוצעים לפי מקצוע                                                     │
│  ─────────────────────────────────────────────────────────────────────     │
│  [Bar chart — אקסנט ירוק על bars, background var(--surface)]               │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│  H2: תלמידים הדורשים תשומת לב                                              │
│  ─────────────────────────────────────────────────────────────────────     │
│  [Table — border-bottom 1px per row, no border-radius, no shadow]          │
└────────────────────────────────────────────────────────────────────────────┘
```

**KPI numbers:** `font: DM Serif Display 400 56px` — המספרים הם ה-hero.
**Hover on rows:** `background: var(--accent-lt)` + `border-right: 3px solid var(--accent)` (RTL: `border-left`)

---

### 3.2 — הזנת ציונים

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ← ציוני מתמטיקה — כיתה ד׳1 — סמסטר א׳                    [ שמור ] [נעל] │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  שם תלמיד          │ מבחן 1 /100 │ מבחן 2 /100 │ עבודה /30 │ ממוצע       │
│  ──────────────────┼─────────────┼─────────────┼───────────┼────────────  │
│  דן לוי            │  [  85  ]   │  [  92  ]   │  [  27  ] │  87.2       │
│  נועה כץ           │  [  78  ]   │  [   _  ]   │  [  25  ] │  —          │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  INPUT FOCUSED: border-bottom: 2px solid var(--accent) — שאר: 1px border  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Table:** `border-collapse: collapse` · header row `background: var(--surface)` עם `border-bottom: 2px solid var(--text)`
**Input in cell:** `border: 0; border-bottom: 1px solid var(--border); background: transparent` · focus → `border-bottom: 2px solid var(--accent)`

---

### 3.3 — הפקת תעודה

```
┌───────────────────────────────────────────────────────────────────────────┐
│  LABEL: הפקת תעודה                                                         │
│  ─────────────────────────────────────────────────────────────────────    │
│                                                                            │
│  ┌──────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │  FORM                        │  │  PREVIEW                          │  │
│  │                              │  │                                   │  │
│  │  LABEL: תלמיד                │  │  ┌─────────────────────────────┐  │  │
│  │  [select ▼]                  │  │  │                             │  │  │
│  │                              │  │  │  [תעודה — Swiss style]      │  │  │
│  │  LABEL: תבנית                │  │  │  border: 1px solid #0D0D0D  │  │  │
│  │  [select ▼]                  │  │  │                             │  │  │
│  │                              │  │  └─────────────────────────────┘  │  │
│  │  [ הורד PDF ]                │  │                                   │  │
│  └──────────────────────────────┘  └───────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 — רשימת תלמידים

```
  ─────────────────────────────────────────────────────────────────────────
  LABEL: רשימת תלמידים (87)           [ + הוסף תלמיד ]  [ ייצא ↓ ]
  ─────────────────────────────────────────────────────────────────────────
  שם               כיתה    ממוצע כללי    תעודה           פעולות
  ─────────────────────────────────────────────────────────────────────────
  אביב כהן         ד׳1      91.4 ↑        ✓               [→]
  בת-אל שמש        ד׳2      73.8          ⏳               [→]
  גיא מזרחי         ה׳1      58.2 ↓        ✗               [→]
  ─────────────────────────────────────────────────────────────────────────
```

**Sorting:** click header → `↑ / ↓` + `border-bottom: 2px solid var(--accent)` על header נבחר
**Row hover:** `background: var(--surface)` + cursor pointer

---

### 3.5 — הגדרות

```
  ─────────────────────────────────────────────────────────────────────────
  LABEL: הגדרות בית ספר
  ─────────────────────────────────────────────────────────────────────────

  [פרטי בית הספר]  [מקצועות]  [מערכות ציונים]  [משתמשים]
  ─────────────────────────────────────────────────────────────────────────

  ACTIVE TAB: border-bottom: 2px solid var(--accent)
  INACTIVE: color: var(--muted), no underline

  FORM SECTION (label always above input, 8px gap):

  LABEL: שם בית הספר
  [ ___________________________________ ]

  LABEL: עיר
  [ ___________________________________ ]

  [ שמור שינויים ]  → button: background var(--accent), color #fff, padding 12px 32px
```

---

---

# 4 — אוגוסט

> **"תעודה היא מסמך. עיצוב ראוי לה."**
> *August* — Luxury Glassmorphism Dark. פרימיום, אלגנטי, serious.

---

## ויז'ן

כיתות לילה כהות עם זכוכית frosted. פלטה של **indigo עמוק + זהב פאר**. הכל מרגיש כמו
תעודת פרס — הסביבה תואמת לחשיבות של המסמכים שהיא מפיקה. Cormorant Garamond לכותרות —
גופן שנושם היסטוריה.

---

## Palette

```
Void           #08090E   /* שחור כמעט-כחול */
Base           #0F1219   /* רקע ראשי */
Surface        rgba(255,255,255,0.05)   /* כרטיס glass */
Surface-Hover  rgba(255,255,255,0.09)
Border         rgba(255,255,255,0.10)
Border-Gold    rgba(202,162,85,0.35)
Text-Primary   #F0EDEA   /* לבן חמים */
Text-Secondary #9CA3AF
Text-Gold      #CAA255   /* זהב */
Indigo         #5B5BD6   /* אקסנט ראשי */
Indigo-Glow    rgba(91,91,214,0.25)
Indigo-Deep    #3B3B99
Gold           #CAA255
Gold-Glow      rgba(202,162,85,0.20)
Success        #34D399
Danger         #F87171
```

### CSS Variables

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

:root {
  --void:         #08090E;
  --base:         #0F1219;
  --surface:      rgba(255,255,255,0.05);
  --surface-h:    rgba(255,255,255,0.09);
  --border:       rgba(255,255,255,0.10);
  --border-gold:  rgba(202,162,85,0.35);
  --text:         #F0EDEA;
  --muted:        #9CA3AF;
  --gold:         #CAA255;
  --gold-glow:    rgba(202,162,85,0.20);
  --indigo:       #5B5BD6;
  --indigo-glow:  rgba(91,91,214,0.25);
  --success:      #34D399;
  --danger:       #F87171;
  --radius-sm:    8px;
  --radius-md:    16px;
  --radius-lg:    24px;
  --blur:         16px;
  --font-serif:   'Cormorant Garamond', serif;
  --font-sans:    'Plus Jakarta Sans', sans-serif;
}
```

---

## Glass Card Recipe

```css
.glass-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  box-shadow:
    0 4px 24px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.07);
  transition: background 200ms ease, box-shadow 200ms ease;
}

.glass-card:hover {
  background: var(--surface-h);
  box-shadow:
    0 8px 32px rgba(0,0,0,0.5),
    0 0 0 1px var(--indigo-glow),
    inset 0 1px 0 rgba(255,255,255,0.10);
}
```

---

## Typography

| תפקיד | גופן | משקל | גודל | מאפיין |
|--------|------|------|------|---------|
| Display | Cormorant Garamond | 600 | 48–64px | `letter-spacing: -0.01em; font-style: italic` |
| Heading | Cormorant Garamond | 500 | 26–32px | |
| Sub | Plus Jakarta Sans | 600 | 16–18px | |
| Body | Plus Jakarta Sans | 400 | 14–15px | `line-height: 1.65` |
| Label | Plus Jakarta Sans | 500 | 11px | `text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted)` |
| Data | Plus Jakarta Sans | 600 | 14–16px | `font-variant-numeric: tabular-nums` |
| Gold Accent | Cormorant Garamond | 400 italic | 18px | `color: var(--gold)` |

---

## Background Atmosphere

```css
/* שכבת ambient glow */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 70% 20%, rgba(91,91,214,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 20% 80%, rgba(202,162,85,0.06) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}
```

---

## מסכים

### 4.1 — Dashboard ראשי

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [LOGO — זהב]  August Grade System            [פעמון ◌]  [M — מיכל כהן  ▼]   │
│  ──────────────────────────────────────────────────────────────────────────    │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  GLASS HERO CARD                                                        │   │
│  │                                                                         │   │
│  │  שלום, *מיכל*                                     [border-gold top]    │   │
│  │  ד׳1 — "שנת לימודים תשפ״ה"                                              │   │
│  │                                                                         │   │
│  │  [████████████████░░░░░]  71% תעודות הושלמו                             │   │
│  │  progress bar: gradient indigo→gold                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐             │
│  │  GLASS STAT      │  │  GLASS STAT      │  │  GLASS STAT      │             │
│  │                  │  │                  │  │                  │             │
│  │  84.3            │  │  7               │  │  6 ימים          │             │
│  │  ─────────────   │  │  ─────────────   │  │  ─────────────   │             │
│  │  ממוצע כיתה      │  │  בסיכון ⚠        │  │  לנעילה ⏳        │             │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘             │
│                                                                                │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────────┐  │
│  │  ממוצע לפי מקצוע                         │  │  פעולות אחרונות            │  │
│  │  [glass chart — lines indigo + gold]     │  │  [glass list]              │  │
│  └──────────────────────────────────────────┘  └────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 — הזנת ציונים

```
  [GLASS TOPBAR] ← מתמטיקה / ד׳1 / סמסטר א׳               [שמור] [🔒 נעל]
  ─────────────────────────────────────────────────────────────────────────

  GLASS TABLE:
  ┌─────────────────────────────────────────────────────────────────────┐
  │  שם תלמיד      │  מבחן 1   │  מבחן 2   │  עבודה   │  ממוצע        │
  │  ─────────────────────────────────────────────────────────────────  │
  │  דן לוי        │  [ 85 ]   │  [ 92 ]   │  [ 27 ]  │  87.2 ★       │
  │  ─────────────────────────────────────────────────────────────────  │
  │  נועה כץ       │  [ 78 ]   │  [    ]   │  [ 25 ]  │  —            │
  └─────────────────────────────────────────────────────────────────────┘

  CELL FOCUSED: glow border rgba(91,91,214,0.6) + background rgba(91,91,214,0.08)
  HIGH GRADE (≥90): gold color + gold glow background
  LOW GRADE (<50): danger color + rgba(248,113,113,0.08) background
```

---

### 4.3 — הפקת תעודה ★ (המסך הכי חזק בקונספט)

```
  [GOLD LABEL: הפקת תעודה]
  ──────────────────────────────────────────────────────────────────────────

  ┌──────────────────────────────────┐  ┌────────────────────────────────────┐
  │  GLASS FORM PANEL                │  │  PREVIEW — "CERTIFICATE"           │
  │                                  │  │                                    │
  │  GOLD LABEL: תלמיד               │  │  ┌──────────────────────────────┐  │
  │  [glass select ▼]                │  │  │  border: 1px solid var(--gold)│  │
  │                                  │  │  │                              │  │
  │  GOLD LABEL: תבנית               │  │  │  "תעודה"                     │  │
  │  ┌────────┐  ┌────────┐          │  │  │  Cormorant Garamond italic   │  │
  │  │ קלאסי  │  │ מינימל │          │  │  │  gold border-top + bottom    │  │
  │  └────────┘  └────────┘          │  │  │                              │  │
  │                                  │  │  └──────────────────────────────┘  │
  │  [GOLD BUTTON: הורד PDF ↓]       │  │                                    │
  │  [OUTLINE: שלח למייל ✉]          │  │  [הדפסה]  [שלח]  [שמור]           │
  └──────────────────────────────────┘  └────────────────────────────────────┘
```

**Certificate preview card:** `border: 1px solid var(--border-gold)` + `box-shadow: 0 0 40px var(--gold-glow)`

---

### 4.4 — רשימת תלמידים

```
  [search input — glass]  [כיתה ▼]  [סטטוס ▼]

  ┌────────────────────────────────────────────────────────────────────┐
  │  GLASS ROW: [🎓] אביב כהן       ד׳1    91.4    ✓ מוכן  [→]        │
  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─      │
  │  GLASS ROW: [🎓] בת-אל שמש      ד׳2    73.8    ⏳        [→]        │
  └────────────────────────────────────────────────────────────────────┘

  ROW HOVER: border-right: 2px solid var(--indigo) + surface-hover background
```

---

### 4.5 — הגדרות בית ספר

```
  GLASS SIDEBAR TABS: border-right: 1px solid var(--border)
  ACTIVE: background: rgba(91,91,214,0.12) + border-right: 2px solid var(--indigo)

  FORM FIELDS: glass input — background var(--surface) + border var(--border)
  FOCUS: border var(--indigo), glow shadow

  SAVE BUTTON: gradient indigo→violet, full width on mobile
```

---

---

# 5 — חצוף

> **"בית ספר? כן. משעמם? לא."**
> *Bold/Cheeky* — Neo-Brutalism. גבולות עבים, צבעים צועקים, לא מתנצל.

---

## ויז'ן

Neo-Brutalism: **border שחור 3px**, צהוב ניאון, כרטיסים עם offset shadow. שום עיגול מעל 8px.
הכל flat, bold, במקום שהמשתמש מצפה לראות משהו "נורמלי" — הוא מקבל משהו שהוא לא ישכח.
מושלם למוסד עם brand חזק או לנוער.

---

## Palette

```
Background     #FAFAF0   /* צהוב קרם — לא לבן גמור */
Surface        #FFFFFF
Yellow         #FFE500   /* ראשי — צהוב ניאון */
Black          #0A0A0A
Coral          #FF4D4D   /* danger / alert */
Mint           #00C48C   /* success */
Blue           #2D5BFF   /* link / secondary action */
Text-Primary   #0A0A0A
Text-Inverse   #FFFFFF
Border         #0A0A0A   /* שחור — תמיד */
Shadow-Offset  4px 4px 0px #0A0A0A   /* signature neo-brutal shadow */
```

### CSS Variables

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap');

:root {
  --bg:           #FAFAF0;
  --surface:      #FFFFFF;
  --yellow:       #FFE500;
  --black:        #0A0A0A;
  --coral:        #FF4D4D;
  --mint:         #00C48C;
  --blue:         #2D5BFF;
  --text:         #0A0A0A;
  --border:       3px solid #0A0A0A;
  --border-2:     2px solid #0A0A0A;
  --shadow:       4px 4px 0px #0A0A0A;
  --shadow-hover: 6px 6px 0px #0A0A0A;
  --shadow-press: 2px 2px 0px #0A0A0A;
  --radius:       4px;   /* מינימלי */
  --font-mono:    'Space Mono', monospace;
  --font-body:    'Plus Jakarta Sans', sans-serif;
}
```

---

## Typography

| תפקיד | גופן | משקל | גודל | מאפיין |
|--------|------|------|------|---------|
| Display | Space Mono | 700 | 48–72px | `text-transform: uppercase; letter-spacing: -0.02em` |
| Heading | Space Mono | 700 | 24–32px | `text-transform: uppercase` |
| Sub | Plus Jakarta Sans | 800 | 16–20px | |
| Body | Plus Jakarta Sans | 400 | 15–16px | `line-height: 1.6` |
| Label | Space Mono | 400 | 11–12px | `text-transform: uppercase; letter-spacing: 0.1em` |
| Data | Space Mono | 700 | 16–20px | tabular nums |
| Button | Plus Jakarta Sans | 700 | 14–15px | `text-transform: uppercase` |

---

## Neo-Brutal Card Recipe

```css
.nb-card {
  background: var(--surface);
  border: var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.nb-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-hover);
}

.nb-card:active {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-press);
}

.nb-card--yellow { background: var(--yellow); }
.nb-card--coral  { background: var(--coral);  color: var(--surface); }
.nb-card--mint   { background: var(--mint);   color: var(--surface); }
```

**Buttons:**
```css
.nb-btn {
  border: var(--border);
  box-shadow: var(--shadow);
  background: var(--yellow);
  color: var(--black);
  font: 700 14px/1 'Plus Jakarta Sans';
  text-transform: uppercase;
  padding: 12px 24px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: transform 100ms, box-shadow 100ms;
}
.nb-btn:hover  { transform: translate(-2px,-2px); box-shadow: var(--shadow-hover); }
.nb-btn:active { transform: translate(2px,2px);  box-shadow: none; }
```

---

## מסכים

### 5.1 — Dashboard ראשי

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │  TOPBAR — border-bottom: 3px solid black  background: var(--yellow)   │    │
│  │  [▓▓ GRADE] [SYSTEM]                              [+ הוסף] [⚙] [M]   │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │ NB-CARD yellow   │  │ NB-CARD white    │  │ NB-CARD coral    │              │
│  │                  │  │                  │  │                  │              │
│  │  84.3            │  │  7               │  │  6               │              │
│  │  ────────────    │  │  ────────────    │  │  ────────────    │              │
│  │  ממוצע כיתה     │  │  בסיכון          │  │  ימים לנעילה     │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  NB-CARD large                                                           │   │
│  │  HEADING: ממוצע לפי מקצוע                                                │   │
│  │  [Bar chart — bars filled yellow, border black, no radius]               │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────┐  ┌───────────────────────────────────────┐   │
│  │  NB-CARD                     │  │  NB-CARD                              │   │
│  │  HEADING: בסיכון             │  │  HEADING: פעולות מהירות               │   │
│  │  [list items — coral dots]   │  │  [NB-BUTTONS: הזן ציון / תעודה / +]   │   │
│  └──────────────────────────────┘  └───────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 — הזנת ציונים

```
  ┌───────────────────────────────────────────────────────────────────────────┐
  │  [← חזרה]  NB-TOPBAR (yellow)                                             │
  │  HEADING (Space Mono bold): ציוני מתמטיקה / ד׳1                          │
  │                                [NB-BTN yellow: שמור]  [NB-BTN coral: נעל] │
  ├───────────────────────────────────────────────────────────────────────────┤
  │                                                                            │
  │  TABLE — border: 3px solid black, border-collapse: collapse               │
  │  header row: background: var(--yellow)                                    │
  │                                                                            │
  │  שם תלמיד     │ מבחן 1   │ מבחן 2   │ עבודה    │ ממוצע                   │
  │  ─────────────┼──────────┼──────────┼──────────┼────────                  │
  │  דן לוי       │ [ 85 ]   │ [ 92 ]   │ [ 27 ]   │ 87.2                    │
  │  נועה כץ      │ [ 78 ]   │ [      ] │ [ 25 ]   │ —                       │
  │                                                                            │
  │  CELL FOCUS: background: var(--yellow) + border: 3px solid black         │
  │  LOW GRADE: background: rgba(255,77,77,0.15), color: var(--coral)         │
  └───────────────────────────────────────────────────────────────────────────┘
```

---

### 5.3 — הפקת תעודה

```
  ┌────────────────────────────────────┐  ┌────────────────────────────────────┐
  │  NB-CARD (left panel)             │  │  PREVIEW AREA                      │
  │  HEADING: הפקת תעודה              │  │                                    │
  │  ────────────────────────────     │  │  ┌──────────────────────────────┐  │
  │                                   │  │  │  NB-CARD preview             │  │
  │  [NB-SELECT ▼] תלמיד              │  │  │  border: 3px solid black     │  │
  │  [NB-SELECT ▼] תבנית              │  │  │  box-shadow: shadow          │  │
  │  [NB-SELECT ▼] שנה                │  │  │                              │  │
  │                                   │  │  │  [תעודה — neo-brutal style]  │  │
  │  [NB-BTN yellow: הורד PDF ↓]      │  │  │  headers in Space Mono bold  │  │
  │  [NB-BTN white:  שלח למייל ✉]     │  │  │                              │  │
  └────────────────────────────────────┘  │  └──────────────────────────────┘  │
                                          └────────────────────────────────────┘
```

---

### 5.4 — רשימת תלמידים

```
  TOPBAR (yellow): HEADING — רשימת תלמידים (87)          [+ הוסף NB-BTN]

  ┌────────────────────────────────────────────────────────────────────┐
  │  [NB-INPUT: 🔍 חפש...]  [NB-SELECT: כיתה ▼]  [NB-SELECT: סטטוס ▼] │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │  NB-ROW (border-bottom 3px black):                                 │
  │  ● אביב כהן      ד׳1    91.4 ↑    [MINT TAG: ✓ מוכן]   [→]        │
  ├────────────────────────────────────────────────────────────────────┤
  │  ● בת-אל שמש     ד׳2    73.8      [YELLOW TAG: ⏳ חסר]  [→]        │
  ├────────────────────────────────────────────────────────────────────┤
  │  ● גיא מזרחי      ה׳1    58.2 ↓    [CORAL TAG: ✗ בסיכון] [→]        │
  └────────────────────────────────────────────────────────────────────┘

  TAGS: border: 2px solid black, box-shadow: 2px 2px 0 black, border-radius: 4px
```

---

### 5.5 — הגדרות בית ספר

```
  PAGE HEADING (Space Mono 700 uppercase): הגדרות בית ספר

  TAB BAR — border: 3px solid black, tabs separated by border:
  [פרטי בית הספר ★]  [מקצועות]  [מערכות ציונים]  [משתמשים]
  ACTIVE TAB: background: var(--yellow)

  ──────────────────────────────────────────────────────────────────

  NB-FORM:

  LABEL (Space Mono): שם בית הספר
  ┌────────────────────────────────────────────────────┐
  │                                                    │
  └────────────────────────────────────────────────────┘
  border: 3px solid black, border-radius: 4px
  FOCUS: box-shadow: 4px 4px 0 black + border-color: var(--blue)

  [NB-BTN yellow: שמור שינויים]  [NB-BTN white: בטל]
```

---

---

## סיכום השוואתי

| קונספט | מצב | Heading Font | Body Font | אקסנט | אופי |
|--------|------|-------------|-----------|-------|------|
| **מרכז הפיקוד** | Dark | Fira Code | Fira Sans | כחול `#2563EB` | אנליטי, טכני, BI |
| **גן הדעת** | Light | Playfair Display | Nunito | ירוק `#2D6A4F` | חמים, אורגני, אקדמי |
| **יריעה שוויצרית** | Light | DM Serif Display | DM Sans | ירוק `#0A7163` | מינימלי, מדויק, editorial |
| **אוגוסט** | Dark | Cormorant Garamond | Plus Jakarta Sans | indigo+זהב | פרימיום, אלגנטי, certified |
| **חצוף** | Light | Space Mono | Plus Jakarta Sans | צהוב `#FFE500` | bold, neo-brutal, memorable |

---

## UX Checklist — חל על כל קונספט

- [ ] `dir="rtl"` + `lang="he"` על `<html>`
- [ ] כל `<input>` עם `<label>` — לא placeholder בלבד
- [ ] טקסט ≥ 4.5:1 contrast ratio (WCAG AA)
- [ ] לחצנים ≥ 44×44px touch target
- [ ] Keyboard nav מלא: Tab / Enter / Esc / Ctrl+S
- [ ] Loading skeleton על כל fetch > 300ms
- [ ] Toast auto-dismiss בין 3–5 שניות
- [ ] Confirmation dialog לפני מחיקה / נעילה
- [ ] `prefers-reduced-motion` — ביטול animations כשנדרש
- [ ] `font-variant-numeric: tabular-nums` על כל עמודת מספרים
- [ ] Responsive: 375px / 768px / 1024px / 1440px
- [ ] RTL: `margin-right → margin-left`, `border-right → border-left`, icons מתהפכים
- [ ] Immutable lock: תא נעול → `cursor: not-allowed`, `opacity: 0.5`, tooltip הסבר
