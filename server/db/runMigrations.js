import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.join(__dirname, "migrations");

export const runMigrations = async (databasePool = pool) => {
  const migrationFiles = fs.readdirSync(migrationsDirectory)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  for (const file of migrationFiles) {
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        ["attendance_grading_schema_migrations"]
      );
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1",
        [file]
      );
      if (applied.rowCount > 0) {
        await client.query("COMMIT");
        continue;
      }

      const migrationSql = fs.readFileSync(
        path.join(migrationsDirectory, file),
        "utf8"
      );
      await client.query(migrationSql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`Applied database migration ${file}.`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
};
