CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grading set types (per-school configurable categories)
CREATE TABLE "grading_set_types" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "grading_set_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grading_set_types_school_id_key_key" ON "grading_set_types"("school_id", "key");
CREATE INDEX "grading_set_types_school_id_idx" ON "grading_set_types"("school_id");

ALTER TABLE "grading_set_types" ADD CONSTRAINT "grading_set_types_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default types per existing school
INSERT INTO "grading_set_types" ("id", "school_id", "key", "label")
SELECT gen_random_uuid()::text, s.id, 'academic', 'לימודי' FROM "schools" s;

INSERT INTO "grading_set_types" ("id", "school_id", "key", "label")
SELECT gen_random_uuid()::text, s.id, 'behavior', 'התנהגות' FROM "schools" s;

-- Link grading sets to types
ALTER TABLE "grading_sets" ADD COLUMN "grading_set_type_id" TEXT;

UPDATE "grading_sets" gs
SET "grading_set_type_id" = t.id
FROM "grading_set_types" t
WHERE t.school_id = gs.school_id
  AND t.key = gs.type;

UPDATE "grading_sets"
SET "grading_set_type_id" = (
    SELECT t.id FROM "grading_set_types" t
    WHERE t.school_id = "grading_sets".school_id AND t.key = 'academic'
    LIMIT 1
)
WHERE "grading_set_type_id" IS NULL;

ALTER TABLE "grading_sets" ALTER COLUMN "grading_set_type_id" SET NOT NULL;

ALTER TABLE "grading_sets" DROP COLUMN "type";

ALTER TABLE "grading_sets" ADD CONSTRAINT "grading_sets_grading_set_type_id_fkey"
    FOREIGN KEY ("grading_set_type_id") REFERENCES "grading_set_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "grading_sets_grading_set_type_id_idx" ON "grading_sets"("grading_set_type_id");

-- Class: Hebrew year + homeroom teacher
ALTER TABLE "classes" ADD COLUMN "year_hebrew" TEXT;
ALTER TABLE "classes" ADD COLUMN "homeroom_teacher_id" TEXT;

ALTER TABLE "classes" ADD CONSTRAINT "classes_homeroom_teacher_id_fkey"
    FOREIGN KEY ("homeroom_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "classes_homeroom_teacher_id_idx" ON "classes"("homeroom_teacher_id");
