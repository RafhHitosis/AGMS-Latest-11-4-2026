import { query } from "../config/db.js";

export const getStudentsBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const result = await query(
      "SELECT id, section_id, name, created_at FROM students WHERE workspace_id = $1 AND section_id = $2 ORDER BY name ASC",
      [req.user.id, sectionId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const addStudent = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { name } = req.body || {};

    if (typeof name !== "string" || !name.trim() || name.trim().length > 255) {
      return res.status(400).json({ error: "Student name must contain 1 to 255 characters." });
    }

    const result = await query(
      "INSERT INTO students (workspace_id, section_id, name) VALUES ($1, $2, $3) RETURNING id, section_id, name, created_at",
      [req.user.id, sectionId, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const batchAddStudents = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { names } = req.body || {};

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: "Names array is required" });
    }
    if (names.some((name) => typeof name === "string" && name.trim().length > 255)) {
      return res.status(400).json({ error: "Student names must be no longer than 255 characters." });
    }

    const seenNames = new Set();
    const uniqueNames = [];
    for (const rawName of names) {
      const name = typeof rawName === "string" ? rawName.trim() : "";
      const key = name.toLowerCase();
      if (name && !seenNames.has(key)) {
        seenNames.add(key);
        uniqueNames.push(name);
      }
    }
    if (uniqueNames.length === 0) {
      return res.status(400).json({ error: "At least one valid student name is required." });
    }

    const result = await query(
      `INSERT INTO students (workspace_id, section_id, name)
       SELECT $1, $2, name
       FROM UNNEST($3::text[]) WITH ORDINALITY AS roster(name, position)
       RETURNING id, section_id, name, created_at`,
      [req.user.id, sectionId, uniqueNames]
    );
    res.status(201).json({
      success: true,
      count: result.rows.length,
      students: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const { name } = req.body || {};

    if (typeof name !== "string" || !name.trim() || name.trim().length > 255) {
      return res.status(400).json({ error: "Student name must contain 1 to 255 characters." });
    }

    const result = await query(
      "UPDATE students SET name = $1 WHERE workspace_id = $2 AND id = $3 AND section_id = $4 RETURNING id, section_id, name",
      [name.trim(), req.user.id, id, sectionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const result = await query(
      "DELETE FROM students WHERE workspace_id = $1 AND id = $2 AND section_id = $3 RETURNING id",
      [req.user.id, id, sectionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
};

export const deleteAllStudentsBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    await query("DELETE FROM students WHERE workspace_id = $1 AND section_id = $2", [req.user.id, sectionId]);
    res.json({ success: true, message: `All students deleted for section ${sectionId}` });
  } catch (err) {
    next(err);
  }
};
