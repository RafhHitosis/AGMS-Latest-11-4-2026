import { checkConnection } from "../config/db.js";
import { resetDatabase as runReset } from "../db/resetDb.js";

export const healthCheck = async (req, res) => {
  const dbStatus = await checkConnection();
  res.status(dbStatus.connected ? 200 : 503).json({
    status: dbStatus.connected ? "healthy" : "database_unreachable",
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
};

export const resetDatabase = async (req, res, next) => {
  try {
    await runReset();
    res.json({
      success: true,
      message: "Database has been completely and cleanly reset.",
    });
  } catch (err) {
    next(err);
  }
};
