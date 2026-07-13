# Phase 07 — API Controllers & Routes

## Routes

| Module | Routes | Notes |
|---|---|---|
| Auth | POST /auth/login, /logout, GET /me | Public login |
| Health | GET /health | |
| School | GET /school, PATCH /school | Admin |
| Users | CRUD /users | Admin |
| Classes | CRUD /classes | Admin |
| ClassGroups | CRUD /classes/:classId/groups | Admin |
| Students | CRUD /students, POST /import, /import-file, PATCH /group-memberships | Admin |
| Subjects | CRUD /subjects | Admin |
| GradingSetTypes | CRUD /grading-set-types | Admin |
| GradingSets | CRUD /grading-sets + /values | Admin |
| GradingTerms | CRUD /grading-terms | Admin; toggle lock |
| TeacherAssignments | CRUD /teacher-assignments, GET /my/teacher-assignments | Admin + Teacher |
| Gradebook | GET /gradebook?classId&termId, POST /bulk-update | RBAC |
| Locks | POST /acquire, /release, /heartbeat, GET /locks | Teacher |
| Certificates | POST /generate, GET /snapshots, GET /snapshots/:id, GET /snapshots/:id/pdf, GET /snapshots/:id/preview-html, GET /supplement-context, PUT /supplements, PUT /label-overrides, POST /nikud-text | Admin+Teacher |
| CertificateTemplates | CRUD /certificate-templates, POST /preview, /logo, /background, GET /asset | Admin |
