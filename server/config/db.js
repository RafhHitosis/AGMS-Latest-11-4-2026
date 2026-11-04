import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "qweR123$",
  database: process.env.PGDATABASE || "attendance_db",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export const query = (text, params) => pool.query(text, params);

export const checkConnection = async () => {
  try {
    const res = await pool.query("SELECT current_database(), current_user, NOW() as current_time");
    return {
      connected: true,
      database: res.rows[0].current_database,
      user: res.rows[0].current_user,
      time: res.rows[0].current_time,
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
    };
  }
};

export default {
  pool,
  query,
  checkConnection,
};
