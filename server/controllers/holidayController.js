import { query } from "../config/db.js";

export const getHolidays = async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, date, name, created_at FROM holidays ORDER BY date ASC"
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
      "INSERT INTO holidays (date, name) VALUES ($1, $2) RETURNING id, date, name, created_at",
      [date, name.trim()]
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
      "UPDATE holidays SET date = $1, name = $2 WHERE id = $3 RETURNING id, date, name, created_at",
      [date, name.trim(), id]
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
      "DELETE FROM holidays WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
};
