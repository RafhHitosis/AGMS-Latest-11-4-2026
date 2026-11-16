ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS access_key_id VARCHAR(8),
  ADD COLUMN IF NOT EXISTS access_key_hash CHAR(64);

DO $$
DECLARE
  administrator_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_users WHERE role = 'admin') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'app_users' AND column_name = 'username'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'app_users' AND column_name = 'password_hash'
    ) THEN
      INSERT INTO app_users (username, display_name, password_hash, role, is_active)
      VALUES (
        'bootstrap-' || replace(gen_random_uuid()::text, '-', ''),
        'Administrator',
        'removed-by-access-key-migration',
        'admin',
        TRUE
      );
    ELSE
      INSERT INTO app_users (display_name, role, is_active)
      VALUES ('Administrator', 'admin', TRUE);
    END IF;
  END IF;

  SELECT id
  INTO administrator_id
  FROM app_users
  WHERE role = 'admin'
  ORDER BY created_at, id
  LIMIT 1;

  UPDATE app_users
  SET role = CASE WHEN id = administrator_id THEN 'admin' ELSE 'teacher' END,
      is_active = (id = administrator_id),
      access_key_id = CASE WHEN id = administrator_id THEN access_key_id ELSE NULL END,
      access_key_hash = CASE WHEN id = administrator_id THEN access_key_hash ELSE NULL END;
END
$$;

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users
  ADD CONSTRAINT app_users_role_check CHECK (role IN ('admin', 'teacher'));
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_access_key_pair_check;
ALTER TABLE app_users
  ADD CONSTRAINT app_users_access_key_pair_check
  CHECK ((access_key_id IS NULL) = (access_key_hash IS NULL));
ALTER TABLE app_users DROP COLUMN IF EXISTS username;
ALTER TABLE app_users DROP COLUMN IF EXISTS password_hash;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_access_key_id_unique
  ON app_users (access_key_id) WHERE access_key_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_one_admin
  ON app_users (role) WHERE role = 'admin';

DROP TABLE IF EXISTS user_sections;
DROP TABLE IF EXISTS audit_events;

CREATE TABLE IF NOT EXISTS account_security_events (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_security_events_created_at
  ON account_security_events (created_at DESC);

DELETE FROM auth_sessions;
DELETE FROM auth_login_attempts;

ALTER TABLE app_config ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE grade_configs ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE section_archives ADD COLUMN IF NOT EXISTS workspace_id UUID;

DO $$
DECLARE
  administrator_id UUID;
BEGIN
  SELECT id INTO administrator_id FROM app_users WHERE role = 'admin';

  UPDATE app_config SET workspace_id = administrator_id WHERE workspace_id IS NULL;
  UPDATE students SET workspace_id = administrator_id WHERE workspace_id IS NULL;
  UPDATE attendance SET workspace_id = administrator_id WHERE workspace_id IS NULL;
  UPDATE holidays SET workspace_id = administrator_id WHERE workspace_id IS NULL;
  UPDATE grade_configs SET workspace_id = administrator_id WHERE workspace_id IS NULL;
  UPDATE grades SET workspace_id = administrator_id WHERE workspace_id IS NULL;
  UPDATE section_archives SET workspace_id = administrator_id WHERE workspace_id IS NULL;
END
$$;

ALTER TABLE app_config ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE holidays ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE grade_configs ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE grades ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE section_archives ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE app_config DROP CONSTRAINT IF EXISTS app_config_pkey;
ALTER TABLE app_config ADD CONSTRAINT app_config_pkey PRIMARY KEY (workspace_id, id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_config_workspace_fkey') THEN
    ALTER TABLE app_config ADD CONSTRAINT app_config_workspace_fkey
      FOREIGN KEY (workspace_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_workspace_fkey') THEN
    ALTER TABLE students ADD CONSTRAINT students_workspace_fkey
      FOREIGN KEY (workspace_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_workspace_fkey') THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_workspace_fkey
      FOREIGN KEY (workspace_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'holidays_workspace_fkey') THEN
    ALTER TABLE holidays ADD CONSTRAINT holidays_workspace_fkey
      FOREIGN KEY (workspace_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_configs_workspace_fkey') THEN
    ALTER TABLE grade_configs ADD CONSTRAINT grade_configs_workspace_fkey
      FOREIGN KEY (workspace_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_workspace_fkey') THEN
    ALTER TABLE grades ADD CONSTRAINT grades_workspace_fkey
      FOREIGN KEY (workspace_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'section_archives_workspace_fkey') THEN
    ALTER TABLE section_archives ADD CONSTRAINT section_archives_workspace_fkey
      FOREIGN KEY (workspace_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_section_student_date;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_section_fkey;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_workspace_section_student_fkey;
ALTER TABLE grades DROP CONSTRAINT IF EXISTS unique_grades_section_term_student;
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_section_fkey;
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_id_fkey;
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_workspace_section_student_fkey;
ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_section_id;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_workspace_section_id_key'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_workspace_section_id_key UNIQUE (workspace_id, section_id, id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_workspace_section_student_date_key'
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT attendance_workspace_section_student_date_key
      UNIQUE (workspace_id, section_id, student_id, date);
  END IF;
END
$$;
ALTER TABLE attendance
  ADD CONSTRAINT attendance_workspace_section_student_fkey
  FOREIGN KEY (workspace_id, section_id, student_id)
  REFERENCES students(workspace_id, section_id, id)
  ON UPDATE CASCADE ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grades_workspace_section_term_student_key'
  ) THEN
    ALTER TABLE grades
      ADD CONSTRAINT grades_workspace_section_term_student_key
      UNIQUE (workspace_id, section_id, term, student_id);
  END IF;
END
$$;
ALTER TABLE grades
  ADD CONSTRAINT grades_workspace_section_student_fkey
  FOREIGN KEY (workspace_id, section_id, student_id)
  REFERENCES students(workspace_id, section_id, id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE grade_configs DROP CONSTRAINT IF EXISTS unique_grade_config_section_term;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grade_configs_workspace_section_term_key'
  ) THEN
    ALTER TABLE grade_configs
      ADD CONSTRAINT grade_configs_workspace_section_term_key
      UNIQUE (workspace_id, section_id, term);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_students_workspace_section
  ON students (workspace_id, section_id, name);
CREATE INDEX IF NOT EXISTS idx_attendance_workspace_section_date
  ON attendance (workspace_id, section_id, date);
CREATE INDEX IF NOT EXISTS idx_holidays_workspace_date
  ON holidays (workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_grade_configs_workspace_section_term
  ON grade_configs (workspace_id, section_id, term);
CREATE INDEX IF NOT EXISTS idx_grades_workspace_section_term
  ON grades (workspace_id, section_id, term);
CREATE INDEX IF NOT EXISTS idx_section_archives_workspace_expiry
  ON section_archives (workspace_id, expires_at);

INSERT INTO app_config (workspace_id, id)
SELECT id, 1 FROM app_users WHERE role = 'admin'
ON CONFLICT (workspace_id, id) DO NOTHING;
