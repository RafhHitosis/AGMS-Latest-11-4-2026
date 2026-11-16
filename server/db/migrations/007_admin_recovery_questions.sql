CREATE TABLE IF NOT EXISTS admin_recovery_questions (
  admin_user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  question_1_id VARCHAR(40) NOT NULL,
  answer_1_salt TEXT NOT NULL,
  answer_1_hash TEXT NOT NULL,
  question_2_id VARCHAR(40) NOT NULL,
  answer_2_salt TEXT NOT NULL,
  answer_2_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT admin_recovery_questions_distinct
    CHECK (question_1_id <> question_2_id)
);
