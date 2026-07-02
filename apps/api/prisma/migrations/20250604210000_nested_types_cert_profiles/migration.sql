-- Nested grading categories + certificate profile per class
ALTER TABLE "grading_set_types" ADD COLUMN "parent_id" TEXT;

CREATE INDEX "grading_set_types_parent_id_idx" ON "grading_set_types"("parent_id");

ALTER TABLE "grading_set_types" ADD CONSTRAINT "grading_set_types_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "grading_set_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "classes" ADD COLUMN "certificate_profile_id" TEXT;
