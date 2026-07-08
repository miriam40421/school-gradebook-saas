# FOLLOWUPS

Bugs found out-of-scope. Format: `[P0/P1/P2/P3] file:line — description — repro`.
Read at session start. P0/P1 items surface before new work begins.

[P2] apps/api/src/students/import-names.util.ts:256 — Pre-existing TS error: `Buffer<ArrayBufferLike>` not assignable to `Buffer` when calling `workbook.xlsx.load(buffer)`. Also test/unit/import-names.util.spec.ts fails to compile because it imports `xlsx` which has no type declarations installed. Both are pre-existing; discovered while running unit test suite on 2026-07-08. Repro: `npx jest test/unit/import-names.util.spec.ts`.

