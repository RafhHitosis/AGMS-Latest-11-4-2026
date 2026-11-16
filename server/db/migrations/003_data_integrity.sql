DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM attendance a
    JOIN students s ON s.id = a.student_id
    WHERE a.section_id <> s.section_id
  ) OR EXISTS (
    SELECT 1 FROM grades g
    JOIN students s ON s.id = g.student_id
    WHERE g.section_id <> s.section_id
  ) THEN
    RAISE EXCEPTION 'Cannot add section-scoped student constraints while mismatched records exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM students WHERE length(btrim(name)) = 0)
    OR EXISTS (SELECT 1 FROM attendance WHERE date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR status <> 'absent')
    OR EXISTS (SELECT 1 FROM grades WHERE term NOT IN ('midterm', 'finals', 'semestral') OR jsonb_typeof(scores) IS DISTINCT FROM 'object')
    OR EXISTS (SELECT 1 FROM grade_configs WHERE term NOT IN ('midterm', 'finals', 'semestral') OR jsonb_typeof(config) IS DISTINCT FROM 'object')
  THEN
    RAISE EXCEPTION 'Cannot add data integrity constraints because existing records contain invalid values.';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_students_section_id'
      AND conrelid = 'students'::regclass
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT unique_students_section_id UNIQUE (section_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_name_nonblank'
      AND conrelid = 'students'::regclass
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_name_nonblank CHECK (length(btrim(name)) > 0);
  END IF;

  ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_student_section_fkey'
      AND conrelid = 'attendance'::regclass
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT attendance_student_section_fkey
      FOREIGN KEY (section_id, student_id)
      REFERENCES students(section_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_date_format_check'
      AND conrelid = 'attendance'::regclass
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT attendance_date_format_check
      CHECK (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_status_check'
      AND conrelid = 'attendance'::regclass
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT attendance_status_check CHECK (status = 'absent');
  END IF;

  ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_id_fkey;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grades_student_section_fkey'
      AND conrelid = 'grades'::regclass
  ) THEN
    ALTER TABLE grades
      ADD CONSTRAINT grades_student_section_fkey
      FOREIGN KEY (section_id, student_id)
      REFERENCES students(section_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grades_term_check'
      AND conrelid = 'grades'::regclass
  ) THEN
    ALTER TABLE grades
      ADD CONSTRAINT grades_term_check
      CHECK (term IN ('midterm', 'finals', 'semestral'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grades_scores_object_check'
      AND conrelid = 'grades'::regclass
  ) THEN
    ALTER TABLE grades
      ADD CONSTRAINT grades_scores_object_check
      CHECK (jsonb_typeof(scores) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grade_configs_term_check'
      AND conrelid = 'grade_configs'::regclass
  ) THEN
    ALTER TABLE grade_configs
      ADD CONSTRAINT grade_configs_term_check
      CHECK (term IN ('midterm', 'finals', 'semestral'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grade_configs_config_object_check'
      AND conrelid = 'grade_configs'::regclass
  ) THEN
    ALTER TABLE grade_configs
      ADD CONSTRAINT grade_configs_config_object_check
      CHECK (jsonb_typeof(config) = 'object');
  END IF;
END
$$;
