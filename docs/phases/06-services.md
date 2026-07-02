# Phase 06 — Backend Services

## Core Services

| Service | Module | Purpose |
|---|---|---|
| AuthService | auth | Password hashing (bcryptjs), JWT generation |
| SchoolService | school | School settings CRUD |
| UsersService | users | User CRUD |
| ClassesService | classes | Class + ClassGroup CRUD |
| StudentsService | students | Student CRUD + bulk XLSX import |
| SubjectsService | subjects | Subject CRUD |
| GradingSetTypesService | grading-set-types | Hierarchy management |
| GradingSetsService | grading-sets | Sets + values CRUD |
| GradingTermsService | grading-terms | Terms + lock/unlock |
| TeacherAssignmentsService | teacher-assignments | Teacher→Subject/Class mapping |
| GradebookService | gradebook | Matrix query + bulk-update + RBAC |
| LocksService | locks | Acquire/release/heartbeat, TTL cleanup |
| CertificatesService | certificates | Snapshot builder + supplement CRUD |
| PdfRenderService | pdf-render | Playwright RTL Hebrew PDF |
| StorageAdapter | storage | Abstract port: memory (dev) / S3 (prod) |
| CertificateTemplatesService | certificate-templates | Template CRUD + layout validation |
