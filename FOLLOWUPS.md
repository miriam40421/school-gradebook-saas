# FOLLOWUPS

Bugs found out-of-scope. Format: `[P0/P1/P2/P3] file:line — description — repro`.
Read at session start. P0/P1 items surface before new work begins.

[P2] apps/api/src/students/import-names.util.ts:256 — Pre-existing TS error: `Buffer<ArrayBufferLike>` not assignable to `Buffer` when calling `workbook.xlsx.load(buffer)`. Also test/unit/import-names.util.spec.ts fails to compile because it imports `xlsx` which has no type declarations installed. Both are pre-existing; discovered while running unit test suite on 2026-07-08. Repro: `npx jest test/unit/import-names.util.spec.ts`.


[P1] auth/auth.module.ts:23 — JWT TTL הורד מ-24h ל-4h (intermediate fix). הפתרון הנכון: refresh token pair + /auth/refresh endpoint + frontend interceptor לחידוש אוטומטי. כרגע 15m/1h TTL בלתי-אפשרי ללא refresh מצד ה-frontend.

[P2] .gitignore — יש להוסיף **/.env.local לgitignore ולהסיר apps/web/.env.local מהtracking. הפקודה הנדרשת (לא ניתן להריץ בסביבה הנוכחית בגלל הגבלת rm):
  git rm --cached apps/web/.env.local
  echo "**/.env.local" >> .gitignore
  git add .gitignore apps/web/.env.local && git commit -m "chore: untrack .env.local"
  הסיבה: .env.local מכוון לqoverrides מקומיות של מפתחים; אם בעתיד יכלול secret יתחבר לgit בטעות.

[P2] security/infra — @nestjs/core v10→v11 injection CVE (GHSA-36xv-jgw5-4q75). שדרוג major version עם breaking changes — דורש regression testing מלא לפני merge.

[P2] security/infra — settingsJson: Record<string,unknown> ב-update-school.dto.ts ללא validation מעמיק. אפשרות A: ValidateNested כנגד DTO מוגדר. אפשרות B: JSON-Schema validator בתוך normalizeCertificateProfiles. נדרש החלטה אנושית על scope.
