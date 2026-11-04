import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initializeDatabase } from "./db/initDb.js";
import { pool } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;
const clientOrigins = process.env.CLIENT_URL
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
if (clientOrigins?.length) {
  app.use(
    cors({
      origin: (origin, callback) => {
        const isLocalOrigin =
          origin && /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin);

        if (!origin || clientOrigins.includes(origin) || isLocalOrigin) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
    }),
  );
} else {
  app.use(cors());
}
app.use(express.json());
app.use(requestLogger);

// API Routes
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

    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`Backend API Server running on http://localhost:${PORT}`);
      console.log(`PostgreSQL Database: ${process.env.PGDATABASE || "attendance_db"}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });

    const shutdown = async () => {
      console.log("\nShutting down gracefully...");
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
