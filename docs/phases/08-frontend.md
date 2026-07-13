# Phase 08 — Frontend

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS 3.4 + CSS Variables
- React Query 5 (server state)
- Zustand 5 (client state: gradebook)
- Lucide React (icons)
- TanStack Virtual (virtualized gradebook)
- react-rnd (certificate template designer)

## Pages

### Admin
- `/login`
- `/dashboard`
- `/school` — school settings
- `/grading-sets` — grading categories
- `/subjects`
- `/classes`
- `/users`
- `/students` — bulk import
- `/gradebook` — read-only admin view
- `/certificates` — generate + list
- `/certificate-templates` — list
- `/certificate-templates/[id]/edit` — designer
- `/help` — admin onboarding guide (4 setup phases)

### Teacher (Homeroom)
- `/teacher` — dashboard (shows classes or subject assignments by role)
- `/teacher/gradebook` — edit grades
- `/teacher/certificates` — generate + download certificates
- `/my-students` — student list, class group assignments, certificate supplements
- `/help/teacher` — subject teacher help guide
- `/help/homeroom` — homeroom teacher help guide

### Teacher (Subject)
- `/teacher/gradebook` — own subjects only

## UI Design

קבצי עיצוב: `docs/ui-ux-spec.md` (נוצר ב-Phase 6 לפני כל קוד).

## Design Tokens

- ראה `apps/web/app/globals.css` (CSS variables)
- ראה `apps/web/tailwind.config.ts`
- Font: Noto Sans Hebrew (Google Fonts)
- RTL: `dir="rtl"`, `lang="he"` על `<html>`
