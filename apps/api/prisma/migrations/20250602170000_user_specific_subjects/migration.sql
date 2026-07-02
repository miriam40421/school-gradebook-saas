-- Teachers linked to specific subjects (not whole categories)

CREATE TABLE "user_subjects" (
    "user_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    CONSTRAINT "user_subjects_pkey" PRIMARY KEY ("user_id","subject_id")
);

CREATE INDEX "user_subjects_subject_id_idx" ON "user_subjects"("subject_id");

ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "user_grading_set_types";
