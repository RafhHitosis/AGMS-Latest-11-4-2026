ALTER TABLE assessment_submissions
  ADD COLUMN IF NOT EXISTS attempt_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_active_attempts
  ON assessment_submissions (assessment_id, student_id, created_at DESC)
  WHERE submitted_at IS NULL;
