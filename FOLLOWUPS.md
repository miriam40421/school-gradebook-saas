# FOLLOWUPS

Bugs found out-of-scope. Format: `[P0/P1/P2/P3] file:line — description — repro`.
Read at session start. P0/P1 items surface before new work begins.

[P2] apps/api/src/students/import-names.util.ts:256 — Pre-existing TS error: `Buffer<ArrayBufferLike>` not assignable to `Buffer` when calling `workbook.xlsx.load(buffer)`. Also test/unit/import-names.util.spec.ts fails to compile because it imports `xlsx` which has no type declarations installed. Both are pre-existing; discovered while running unit test suite on 2026-07-08. Repro: `npx jest test/unit/import-names.util.spec.ts`.


[P1] auth/auth.module.ts:23 — JWT TTL הורד מ-24h ל-4h (intermediate fix). הפתרון הנכון: refresh token pair + /auth/refresh endpoint + frontend interceptor לחידוש אוטומטי. כרגע 15m/1h TTL בלתי-אפשרי ללא refresh מצד ה-frontend.
