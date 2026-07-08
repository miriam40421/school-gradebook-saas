-- soft delete: add deleted_at to 6 business entities
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE grading_set_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE grading_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- indices for soft delete filter performance
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users(deleted_at);
CREATE INDEX IF NOT EXISTS classes_deleted_at_idx ON classes(deleted_at);
CREATE INDEX IF NOT EXISTS students_deleted_at_idx ON students(deleted_at);
CREATE INDEX IF NOT EXISTS grading_set_types_deleted_at_idx ON grading_set_types(deleted_at);
CREATE INDEX IF NOT EXISTS grading_sets_deleted_at_idx ON grading_sets(deleted_at);
CREATE INDEX IF NOT EXISTS subjects_deleted_at_idx ON subjects(deleted_at);

-- logout revocation denylist
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revoked_tokens_expires_at_idx ON revoked_tokens(expires_at);
