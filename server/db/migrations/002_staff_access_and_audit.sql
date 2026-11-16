CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(80) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sections (
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    section_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sections_section ON user_sections (section_id);

CREATE TABLE IF NOT EXISTS audit_events (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    actor_username VARCHAR(80) NOT NULL,
    action VARCHAR(160) NOT NULL,
    section_id VARCHAR(50),
    status_code SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_created_at ON audit_events (actor_user_id, created_at DESC);

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id) ON DELETE CASCADE;

DELETE FROM auth_sessions WHERE user_id IS NULL;

ALTER TABLE auth_sessions ALTER COLUMN user_id SET NOT NULL;
