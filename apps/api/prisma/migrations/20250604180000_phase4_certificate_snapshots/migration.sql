-- CreateTable
CREATE TABLE "certificate_snapshots" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "pdf_storage_key" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_snapshots_school_id_class_id_term_id_idx" ON "certificate_snapshots"("school_id", "class_id", "term_id");

-- CreateIndex
CREATE INDEX "certificate_snapshots_school_id_student_id_term_id_idx" ON "certificate_snapshots"("school_id", "student_id", "term_id");

-- AddForeignKey
ALTER TABLE "certificate_snapshots" ADD CONSTRAINT "certificate_snapshots_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_snapshots" ADD CONSTRAINT "certificate_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_snapshots" ADD CONSTRAINT "certificate_snapshots_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_snapshots" ADD CONSTRAINT "certificate_snapshots_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "grading_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_snapshots" ADD CONSTRAINT "certificate_snapshots_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
