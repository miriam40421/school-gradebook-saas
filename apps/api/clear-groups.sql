DELETE FROM student_class_groups;
UPDATE students SET class_group_id = NULL;
UPDATE teacher_assignments SET class_group_id = NULL;
DELETE FROM class_groups;
