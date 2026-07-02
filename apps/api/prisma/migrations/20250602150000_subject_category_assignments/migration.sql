-- Subject links to category (type) only; teacher class assignments

CREATE TABLE "teacher_assignments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_group_id" TEXT,
    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "subjects" ADD COLUMN "grading_set_type_id" TEXT;

UPDATE "subjects" s
SET "grading_set_type_id" = gs."grading_set_type_id"
FROM "grading_sets" gs
WHERE s."grading_set_id" = gs."id";

ALTER TABLE "subjects" ALTER COLUMN "grading_set_type_id" SET NOT NULL;

ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_grading_set_id_fkey";
ALTER TABLE "subjects" DROP COLUMN "grading_set_id";

CREATE INDEX "subjects_grading_set_type_id_idx" ON "subjects"("grading_set_type_id");
CREATE INDEX "teacher_assignments_school_id_idx" ON "teacher_assignments"("school_id");
CREATE INDEX "teacher_assignments_user_id_idx" ON "teacher_assignments"("user_id");
CREATE INDEX "teacher_assignments_subject_id_idx" ON "teacher_assignments"("subject_id");
CREATE INDEX "teacher_assignments_class_id_idx" ON "teacher_assignments"("class_id");

ALTER TABLE "subjects" ADD CONSTRAINT "subjects_grading_set_type_id_fkey" FOREIGN KEY ("grading_set_type_id") REFERENCES "grading_set_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
