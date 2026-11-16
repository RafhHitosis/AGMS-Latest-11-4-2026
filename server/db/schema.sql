CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
    access_key_id VARCHAR(8),
    access_key_hash CHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    welcome_acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_users_access_key_pair_check
      CHECK ((access_key_id IS NULL) = (access_key_hash IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_one_admin
  ON app_users (role) WHERE role = 'admin';
CREATE UNIQUE INDEX IF NOT EXISTS app_users_access_key_hash_unique
  ON app_users (access_key_hash) WHERE access_key_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_recovery_questions (
    admin_user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    question_1_id VARCHAR(40) NOT NULL,
    answer_1_salt TEXT NOT NULL,
    answer_1_hash TEXT NOT NULL,
    question_2_id VARCHAR(40) NOT NULL,
    answer_2_salt TEXT NOT NULL,
    answer_2_hash TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    attempt_window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_recovery_questions_distinct
      CHECK (question_1_id <> question_2_id)
);

CREATE TABLE IF NOT EXISTS account_security_events (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_security_events_created_at
  ON account_security_events (created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
    ip_hash CHAR(64) PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_window_started_at
    ON auth_login_attempts (window_started_at);

CREATE TABLE IF NOT EXISTS app_config (
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    id INT NOT NULL DEFAULT 1,
    app_title TEXT NOT NULL DEFAULT 'AGMS',
    app_subtitle TEXT NOT NULL DEFAULT 'Choose a year level and section to manage attendance and grades',
    app_logo TEXT NOT NULL DEFAULT '',
    term_dates JSONB NOT NULL DEFAULT '{}'::jsonb,
    sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    schedules JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_config_pkey PRIMARY KEY (workspace_id, id),
    CONSTRAINT single_config_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT students_workspace_section_id_key UNIQUE (workspace_id, section_id, id),
    CONSTRAINT students_name_nonblank CHECK (length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_students_workspace_section
  ON students (workspace_id, section_id, name);

CREATE TABLE IF NOT EXISTS section_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    year_level VARCHAR(255) NOT NULL,
    section_data JSONB NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_section_archives_workspace_expiry
  ON section_archives (workspace_id, expires_at);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    date VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'absent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_workspace_section_student_date_key
      UNIQUE (workspace_id, section_id, student_id, date),
    CONSTRAINT attendance_workspace_section_student_fkey
      FOREIGN KEY (workspace_id, section_id, student_id)
      REFERENCES students(workspace_id, section_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT attendance_date_format_check
      CHECK (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
    CONSTRAINT attendance_status_check CHECK (status = 'absent')
);
CREATE INDEX IF NOT EXISTS idx_attendance_workspace_section_date
  ON attendance (workspace_id, section_id, date);

CREATE TABLE IF NOT EXISTS holidays (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_holidays_workspace_date
  ON holidays (workspace_id, date);

CREATE TABLE IF NOT EXISTS grade_configs (
    id SERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    term VARCHAR(20) NOT NULL DEFAULT 'midterm',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT grade_configs_workspace_section_term_key
      UNIQUE (workspace_id, section_id, term),
    CONSTRAINT grade_configs_term_check
      CHECK (term IN ('midterm', 'finals', 'semestral')),
    CONSTRAINT grade_configs_config_object_check CHECK (jsonb_typeof(config) = 'object')
);

CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    term VARCHAR(20) NOT NULL DEFAULT 'midterm',
    student_id VARCHAR(50) NOT NULL,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT grades_workspace_section_term_student_key
      UNIQUE (workspace_id, section_id, term, student_id),
    CONSTRAINT grades_workspace_section_student_fkey
      FOREIGN KEY (workspace_id, section_id, student_id)
      REFERENCES students(workspace_id, section_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT grades_term_check CHECK (term IN ('midterm', 'finals', 'semestral')),
    CONSTRAINT grades_scores_object_check CHECK (jsonb_typeof(scores) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_grades_workspace_section_term
  ON grades (workspace_id, section_id, term);

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'quiz' CHECK (type IN ('exam', 'quiz', 'recitation')),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(120) NOT NULL DEFAULT '',
    term VARCHAR(20) NOT NULL DEFAULT 'midterm' CHECK (term IN ('prelim', 'midterm', 'pre_final', 'finals', 'semestral')),
    description TEXT NOT NULL DEFAULT '',
    general_instructions TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    access_code VARCHAR(32) NOT NULL UNIQUE,
    time_limit_minutes INTEGER NOT NULL DEFAULT 0,
    passing_percentage INTEGER NOT NULL DEFAULT 50,
    shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
    shuffle_choices BOOLEAN NOT NULL DEFAULT FALSE,
    show_score_immediately BOOLEAN NOT NULL DEFAULT TRUE,
    anti_cheat_monitoring BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessments_workspace_section
  ON assessments (workspace_id, section_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_access_code
  ON assessments (access_code);

CREATE TABLE IF NOT EXISTS assessment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id VARCHAR(50),
    student_name VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    total_points NUMERIC(6, 2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    fullscreen_exit_count INTEGER NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    grading_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    integrity_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempt_token_hash TEXT,
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    saved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment
  ON assessment_submissions (assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_student
  ON assessment_submissions (assessment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_active_attempts
  ON assessment_submissions (assessment_id, student_id, created_at DESC)
  WHERE submitted_at IS NULL;

CREATE TABLE IF NOT EXISTS recitation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    max_score NUMERIC(6, 2) NOT NULL DEFAULT 10,
    topic_prompt TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recitation_logs_assessment
  ON recitation_logs (assessment_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
