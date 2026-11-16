CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'quiz' CHECK (type IN ('exam', 'quiz', 'recitation')),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(120) NOT NULL DEFAULT '',
    term VARCHAR(20) NOT NULL DEFAULT 'midterm' CHECK (term IN ('midterm', 'finals', 'semestral')),
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment
  ON assessment_submissions (assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_student
  ON assessment_submissions (assessment_id, student_id);

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
