import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { pool } from "../config/db.js";
import { initializeDatabase } from "./initDb.js";

const databaseName = process.env.PGDATABASE || "attendance_db";

export const resetDatabase = async () => {
  if (process.env.ALLOW_DATABASE_RESET !== "true") {
    throw new Error("Set ALLOW_DATABASE_RESET=true to enable application data reset.");
  }

  await initializeDatabase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE TABLE
        grades,
        grade_configs,
        attendance,
        students,
        holidays,
        section_archives,
        auth_sessions,
        auth_login_attempts
      RESTART IDENTITY CASCADE
    `);
    await client.query(
      `UPDATE app_config
       SET app_title = 'AGMS',
           app_subtitle = 'Choose a year level and section to manage attendance and grades',
           app_logo = '',
           term_dates = '{}'::jsonb,
           sections = '{}'::jsonb,
           schedules = '{}'::jsonb,
           updated_at = NOW()
       WHERE id = 1`
    );
    await client.query("COMMIT");
    console.log("Application data cleared; accounts and security-event history retained.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    if (process.env.ALLOW_DATABASE_RESET !== "true") {
      throw new Error("Set ALLOW_DATABASE_RESET=true to enable application data reset.");
    }

    const confirmation = await readline.question(
      `This clears application data in "${databaseName}". Type the database name to continue: `
    );
    if (confirmation !== databaseName) {
      throw new Error("Database name did not match; reset cancelled.");
    }

    await resetDatabase();
    console.log("Database reset complete.");
  } catch (err) {
    console.error("Database reset error:", err.message);
    process.exitCode = 1;
  } finally {
    readline.close();
    await pool.end();
  }
}
