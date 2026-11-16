import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initializeDatabase } from "./db/initDb.js";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import publicAssessmentRoutes from "./routes/publicAssessmentRoutes.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { isAllowedOrigin } from "./middleware/allowedOrigin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;
const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS || "0");

if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
}
if (trustedProxyHops > 0) {
  app.set("trust proxy", trustedProxyHops);
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    exposedHeaders: ["Retry-After"],
  }),
);
app.use(express.json({ limit: "1mb" }));

// Public endpoints (no authentication required)
app.use("/api/auth", authRoutes);
app.use("/api/public/assessments", publicAssessmentRoutes);
app.use("/api", requireAuth);
app.use("/api", apiRoutes);

// Root fallback route
app.get("/", (req, res) => {
  res.json({
    message: "Attendance System PostgreSQL API Server is running",
    docs: "/api/health",
  });
});

// Central Error Handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Ensure tables exist on startup
    await initializeDatabase();
    const administratorKey = await pool.query(
      "SELECT 1 FROM app_users WHERE role = 'admin' AND is_active AND access_key_hash IS NOT NULL LIMIT 1",
    );
    if (administratorKey.rowCount === 0) {
      throw new Error("Run npm run db:init and securely save the one-time administrator access key before starting the server.");
    }
    await pool.query("DELETE FROM section_archives WHERE expires_at <= NOW()");
    const archiveCleanupTimer = setInterval(() => {
      pool.query("DELETE FROM section_archives WHERE expires_at <= NOW()")
        .then((result) => {
          if (result.rowCount > 0) {
            console.log(`Purged ${result.rowCount} expired section archive(s).`);
          }
        })
        .catch((err) => {
          console.error("Failed to purge expired section archives:", err);
        });
    }, 24 * 60 * 60 * 1000);
    archiveCleanupTimer.unref();

    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`Backend API Server running on http://localhost:${PORT}`);
      console.log(`PostgreSQL Database: ${process.env.PGDATABASE || "attendance_db"}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });

    const shutdown = async () => {
      console.log("\nShutting down gracefully...");
      clearInterval(archiveCleanupTimer);
      server.close(() => {
        pool.end(() => {
          console.log("PostgreSQL pool closed. Exited.");
          process.exit(0);
        });
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
