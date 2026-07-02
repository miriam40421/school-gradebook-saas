# Phase 04 — Data Models (Prisma)

## Models

| Model | Key Fields | Notes |
|---|---|---|
| School | id (uuid), name, settingsJson | Multi-tenant root |
| User | id, schoolId, role, email, passwordHash | SoftDelete |
| Class | id, schoolId, name, year, homeroomTeacherId | SoftDelete |
| ClassGroup | id, classId, subjectId, name | |
| Student | id, classId, fullName | SoftDelete |
| StudentClassGroup | studentId, classGroupId | Junction |
| Subject | id, schoolId, gradingSetTypeId, name | SoftDelete |
| GradingSetType | id, schoolId, key, parentId | Hierarchy |
| GradingSet | id, gradingSetTypeId, name | |
| GradingSetValue | gradingSetId, label, order | |
| GradingTerm | id, schoolId, name, isLocked | |
| GradeEntry | schoolId, studentId, subjectId, termId, value, version | UNIQUE constraint |
| UserSubject | userId, subjectId | Teacher→Subject |
| TeacherAssignment | userId, classId, subjectId, classGroupId | |
| EditLock | schoolId, classId, subjectId, termId, lockedBy, expiresAt | TTL 15min |
| CertificateSnapshot | schoolId, studentId, classId, termId, snapshotJson, pdfStorageKey | Immutable |
| CertificateSupplement | schoolId, studentId, absences, signatures, gradeComments | |
| CertificateTemplate | schoolId, layoutJson, logoStorageKey, orientation | |

## Key Constraints

- UUID PKs on all tables
- `schoolId` FK on every tenant-scoped entity
- GradeEntry: UNIQUE (schoolId, studentId, subjectId, termId)
- CertificateSnapshot: no UPDATE/DELETE (immutable)
