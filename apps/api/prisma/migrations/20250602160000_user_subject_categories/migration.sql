-- Subject teachers: categories at profile; pick subjects per class assignment

CREATE TABLE "user_grading_set_types" (
    "user_id" TEXT NOT NULL,
    "grading_set_type_id" TEXT NOT NULL,
    CONSTRAINT "user_grading_set_types_pkey" PRIMARY KEY ("user_id","grading_set_type_id")
);

CREATE INDEX "user_grading_set_types_grading_set_type_id_idx" ON "user_grading_set_types"("grading_set_type_id");

ALTER TABLE "user_grading_set_types" ADD CONSTRAINT "user_grading_set_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_grading_set_types" ADD CONSTRAINT "user_grading_set_types_grading_set_type_id_fkey" FOREIGN KEY ("grading_set_type_id") REFERENCES "grading_set_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_grading_set_types" ("user_id", "grading_set_type_id")
SELECT DISTINCT us."user_id", s."grading_set_type_id"
FROM "user_subjects" us
JOIN "subjects" s ON s."id" = us."subject_id";

DROP TABLE "user_subjects";
