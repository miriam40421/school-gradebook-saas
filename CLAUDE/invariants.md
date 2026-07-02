# Invariants — MUSTs / NEVERs

Load-bearing rules derived from business requirements. Read before touching named surfaces.

## GradingTerm

- **NEVER** allow grade changes when `isLocked=true`. API must return 403, no exceptions.
- **NEVER** delete or update a GradeEntry that belongs to a locked term.

## CertificateSnapshot

- **NEVER** UPDATE or DELETE a CertificateSnapshot after creation — immutable by design.
- New version = new snapshot row. Old row stays.
- **MUST** wrap snapshot creation in a transaction.

## EditLock

- TTL = 15 minutes. Heartbeat = 60 seconds.
- **NEVER** extend a lock without a valid heartbeat from the lock owner.

## GradeEntry

- Unique constraint: `(schoolId, studentId, subjectId, termId)`.
- **NEVER** insert without checking this — use upsert or explicit conflict handling.

## schoolId

- **EVERY** entity that belongs to a school **MUST** carry `schoolId` + FK constraint.
- **NEVER** query cross-school data without explicit tenant isolation.

## Auth / JWT

- **NEVER** trust a client-supplied `schoolId` without verifying it matches the JWT claim.
- **NEVER** skip ownership check on any resource endpoint.
