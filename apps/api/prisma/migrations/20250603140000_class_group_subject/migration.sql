-- AlterTable
ALTER TABLE "class_groups" ADD COLUMN "subject_id" TEXT;

-- CreateIndex
CREATE INDEX "class_groups_subject_id_idx" ON "class_groups"("subject_id");

-- AddForeignKey
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
