-- Class groups, user-subject assignments, student group membership

CREATE TABLE "class_groups" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_subjects" (
    "user_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    CONSTRAINT "user_subjects_pkey" PRIMARY KEY ("user_id","subject_id")
);

ALTER TABLE "students" ADD COLUMN "class_group_id" TEXT;

CREATE INDEX "class_groups_school_id_idx" ON "class_groups"("school_id");
CREATE INDEX "class_groups_class_id_idx" ON "class_groups"("class_id");
CREATE INDEX "user_subjects_subject_id_idx" ON "user_subjects"("subject_id");
CREATE INDEX "students_class_group_id_idx" ON "students"("class_group_id");

ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "students" ADD CONSTRAINT "students_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
