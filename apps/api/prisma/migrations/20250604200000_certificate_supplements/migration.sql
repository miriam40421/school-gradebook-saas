-- CreateTable
CREATE TABLE "certificate_supplements" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "absences" TEXT,
    "lateness" TEXT,
    "hour_absences" TEXT,
    "hour_lateness" TEXT,
    "evaluation" TEXT,
    "homeroom_signature" TEXT,
    "principal_signature" TEXT,
    "grade_comments" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_supplements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_supplements_school_id_class_id_term_id_idx" ON "certificate_supplements"("school_id", "class_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_supplements_school_id_student_id_term_id_key" ON "certificate_supplements"("school_id", "student_id", "term_id");

-- AddForeignKey
ALTER TABLE "certificate_supplements" ADD CONSTRAINT "certificate_supplements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_supplements" ADD CONSTRAINT "certificate_supplements_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_supplements" ADD CONSTRAINT "certificate_supplements_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_supplements" ADD CONSTRAINT "certificate_supplements_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "grading_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
