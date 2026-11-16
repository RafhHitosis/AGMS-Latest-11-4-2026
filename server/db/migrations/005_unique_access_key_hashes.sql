CREATE UNIQUE INDEX IF NOT EXISTS app_users_access_key_hash_unique
  ON app_users (access_key_hash) WHERE access_key_hash IS NOT NULL;
