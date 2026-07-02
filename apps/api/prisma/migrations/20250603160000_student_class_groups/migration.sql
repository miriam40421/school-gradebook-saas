-- CreateTable
CREATE TABLE "student_class_groups" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_group_id" TEXT NOT NULL,

    CONSTRAINT "student_class_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_class_groups_student_id_class_group_id_key" ON "student_class_groups"("student_id", "class_group_id");

-- CreateIndex
CREATE INDEX "student_class_groups_school_id_idx" ON "student_class_groups"("school_id");

-- CreateIndex
CREATE INDEX "student_class_groups_student_id_idx" ON "student_class_groups"("student_id");

-- CreateIndex
CREATE INDEX "student_class_groups_class_group_id_idx" ON "student_class_groups"("class_group_id");

-- AddForeignKey
ALTER TABLE "student_class_groups" ADD CONSTRAINT "student_class_groups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_groups" ADD CONSTRAINT "student_class_groups_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_groups" ADD CONSTRAINT "student_class_groups_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy single group assignment
INSERT INTO "student_class_groups" ("id", "school_id", "student_id", "class_group_id")
SELECT gen_random_uuid()::text, "school_id", "id", "class_group_id"
FROM "students"
WHERE "class_group_id" IS NOT NULL;
