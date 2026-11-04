import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, checkConnection } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabase = async () => {
  console.log("Checking PostgreSQL database connection...");
  const conn = await checkConnection();
  if (!conn.connected) {
    throw new Error(`Failed to connect to PostgreSQL: ${conn.error}`);
  }
  console.log(`Connected to PostgreSQL database '${conn.database}' as user '${conn.user}'.`);

  const schemaPath = path.resolve(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  console.log("Executing schema.sql...");
  await pool.query(schemaSql);
  console.log("Database initialized successfully!");
};

// If run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase()
    .then(() => {
      console.log("Initialization complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Initialization error:", err);
      process.exit(1);
    });
}
