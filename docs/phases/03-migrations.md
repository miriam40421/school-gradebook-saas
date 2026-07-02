# Phase 03 — Database Migrations

## Migration History

| Migration | Purpose |
|---|---|
| 20250602000000_init | Core schema |
| 20250602120000_phase1_class_types | Class hierarchies |
| 20250602140000_phase1_teacher_students_groups | User/Student/Group relations |
| 20250602150000_subject_category_assignments | Subject CRUD |
| 20250602160000_user_subject_categories | Teacher→Subject mapping |
| 20250602170000_user_specific_subjects | Refined teacher assignments |
| 20250603120000_phase2_gradebook | GradeEntry + GradingTerm |
| 20250603140000_class_group_subject | ClassGroup→Subject FK |
| 20250603160000_student_class_groups | StudentClassGroup junction |
| 20250604120000_phase3_locks | EditLock table |
| 20250604180000_phase4_certificate_snapshots | CertificateSnapshot (immutable) |
| 20250604200000_certificate_supplements | CertificateSupplement |
| 20250604210000_nested_types_cert_profiles | Grading set type hierarchy |
| 20250614120000_phase5_certificate_templates | CertificateTemplate (designer) |

## Commands

```bash
pnpm db:migrate   # prisma migrate deploy
pnpm db:seed      # seed demo school + users
```
