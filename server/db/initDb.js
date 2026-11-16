import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, checkConnection } from "../config/db.js";
import { runMigrations } from "./runMigrations.js";
import { generateAccessKey } from "../auth/accessKey.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const applySchemaAndMigrations = async (databasePool = pool, migrate = runMigrations) => {
  const { rows } = await databasePool.query(
    "SELECT to_regclass('public.app_config') IS NOT NULL AS has_existing_schema",
  );
  const hasExistingSchema = rows[0].has_existing_schema;
  const schemaPath = path.resolve(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!hasExistingSchema) {
    await databasePool.query(schemaSql);
  }
  await migrate(databasePool);
  if (hasExistingSchema) {
    await databasePool.query(schemaSql);
  }
};

export const initializeDatabase = async ({ issueBootstrapKey = false } = {}) => {
  console.log("Checking PostgreSQL database connection...");
  const conn = await checkConnection();
  if (!conn.connected) {
    throw new Error(`Failed to connect to PostgreSQL: ${conn.error}`);
  }
  console.log(`Connected to PostgreSQL database '${conn.database}' as user '${conn.user}'.`);

  console.log("Checking database schema and migrations...");
  await applySchemaAndMigrations();
  await ensureAdministratorKey(issueBootstrapKey);
  console.log("Database initialized successfully!");
};

const ensureAdministratorKey = async (issueKey) => {
  const { rows } = await pool.query(
    "SELECT id, access_key_hash FROM app_users WHERE role = 'admin' AND is_active ORDER BY created_at, id LIMIT 1",
  );
  const administrator = rows[0];
  if (!administrator) {
    throw new Error("No active administrator account exists after database initialization.");
  }
  if (administrator.access_key_hash || !issueKey) return;

  const accessKey = generateAccessKey();
  const updated = await pool.query(
    `UPDATE app_users
     SET access_key_id = $2, access_key_hash = $3, updated_at = NOW()
     WHERE id = $1 AND access_key_hash IS NULL
     RETURNING id`,
    [administrator.id, accessKey.accessKeyId, accessKey.accessKeyHash],
  );
  if (updated.rowCount === 0) return;
  console.log(`Initial administrator access key (shown only once): ${accessKey.accessKey}`);
};

// If run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase({ issueBootstrapKey: true })
    .then(() => {
      console.log("Initialization complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Initialization error:", err);
      process.exit(1);
    });
}
