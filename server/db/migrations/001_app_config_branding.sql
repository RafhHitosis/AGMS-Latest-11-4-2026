ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS app_subtitle TEXT NOT NULL
    DEFAULT 'Choose a year level and section to manage attendance',
  ADD COLUMN IF NOT EXISTS app_logo TEXT NOT NULL DEFAULT '';
