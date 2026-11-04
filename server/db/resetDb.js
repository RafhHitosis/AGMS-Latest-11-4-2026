import { pool } from "../config/db.js";
import { initializeDatabase } from "./initDb.js";
import { fileURLToPath } from "url";

export const resetDatabase = async () => {
  console.log("Starting full database reset...");
  
  // Drop tables in safe cascade order
  await pool.query(`
    DROP TABLE IF EXISTS grades CASCADE;
    DROP TABLE IF EXISTS grade_configs CASCADE;
    DROP TABLE IF EXISTS attendance CASCADE;
    DROP TABLE IF EXISTS students CASCADE;
    DROP TABLE IF EXISTS holidays CASCADE;
    DROP TABLE IF EXISTS app_config CASCADE;
  `);

  console.log("All existing tables dropped cleanly.");
  
  // Re-run schema initialization
  await initializeDatabase();
  console.log("Database successfully reset and re-created with clean state.");
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  resetDatabase()
    .then(() => {
      console.log("Database reset complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database reset error:", err);
      process.exit(1);
    });
}
