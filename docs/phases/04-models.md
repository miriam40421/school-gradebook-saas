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
| EditLock | schoolId, classId, subjectId, termId, classGroupId, lockedBy, expiresAt | TTL 15min |
| CertificateSnapshot | schoolId, studentId, classId, termId, snapshotJson, pdfStorageKey, generatedBy | Immutable |
| CertificateSupplement | schoolId, studentId, classId, termId, absences, lateness, hourAbsences, hourLateness, evaluation, homeroomSignature, principalSignature, gradeComments, nikudOverrides | UNIQUE(schoolId, studentId, termId) |
| CertificateTemplate | schoolId, name, layoutJson, layoutSchemaVersion, layoutVersion, logoStorageKey, orientation | |
| RevokedToken | jti (PK), expiresAt, revokedAt | JWT revocation on logout |

## Key Constraints

- UUID PKs on all tables (except RevokedToken which uses `jti` string PK)
- `schoolId` FK on every tenant-scoped entity
- GradeEntry: UNIQUE (schoolId, studentId, subjectId, termId)
- CertificateSupplement: UNIQUE (schoolId, studentId, termId)
- CertificateSnapshot: no UPDATE/DELETE (immutable)
- GradingSetType: hierarchical via `parentId` self-join
- Soft delete: User, Class, Student, Subject, GradingSetType, GradingSet
