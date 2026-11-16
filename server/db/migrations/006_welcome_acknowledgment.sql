ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS welcome_acknowledged_at TIMESTAMPTZ;
