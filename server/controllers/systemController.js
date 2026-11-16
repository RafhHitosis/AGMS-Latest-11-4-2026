import { checkConnection, pool } from "../config/db.js";

export const healthCheck = async (req, res) => {
  const dbStatus = await checkConnection();
  res.status(dbStatus.connected ? 200 : 503).json({
    status: dbStatus.connected ? "healthy" : "database_unreachable",
    timestamp: new Date().toISOString(),
  });
};

export const resetDatabase = async (req, res, next) => {
  try {
    if (process.env.ALLOW_DATABASE_RESET !== "true") {
      return res.status(403).json({ error: "Database reset is disabled." });
    }

    const databaseStatus = await checkConnection();
    if (!databaseStatus.connected) {
      return res.status(503).json({ error: "Database is unavailable." });
    }
    if (req.body?.confirmDatabaseName !== databaseStatus.database) {
      return res.status(400).json({
        error: "Type the exact database name in confirmDatabaseName to reset application data.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const table of ["grades", "grade_configs", "attendance", "students", "holidays", "section_archives"]) {
        await client.query(`DELETE FROM ${table} WHERE workspace_id = $1`, [req.user.id]);
      }
      await client.query(
        `UPDATE app_config
         SET app_title = 'AGMS',
             app_subtitle = 'Choose a year level and section to manage attendance and grades',
             app_logo = '',
             term_dates = '{}'::jsonb,
             sections = '{}'::jsonb,
             schedules = '{}'::jsonb,
             updated_at = NOW()
         WHERE workspace_id = $1 AND id = 1`,
        [req.user.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    res.json({
      success: true,
      message: "Your workspace data was cleared. Other accounts and their data were not changed.",
    });
  } catch (err) {
    next(err);
  }
};
