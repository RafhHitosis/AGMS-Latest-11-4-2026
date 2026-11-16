import { query } from "../config/db.js";

export const getHolidays = async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, date, name, created_at FROM holidays WHERE workspace_id = $1 ORDER BY date ASC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const addHoliday = async (req, res, next) => {
  try {
    const { date, name } = req.body;
    if (!date || !name) {
      return res.status(400).json({ error: "date and name are required" });
    }

    const result = await query(
      "INSERT INTO holidays (workspace_id, date, name) VALUES ($1, $2, $3) RETURNING id, date, name, created_at",
      [req.user.id, date, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, name } = req.body;
    if (!date || !name?.trim()) {
      return res.status(400).json({ error: "date and name are required" });
    }

    const result = await query(
      "UPDATE holidays SET date = $1, name = $2 WHERE workspace_id = $3 AND id = $4 RETURNING id, date, name, created_at",
      [date, name.trim(), req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      "DELETE FROM holidays WHERE workspace_id = $1 AND id = $2 RETURNING id",
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
};
