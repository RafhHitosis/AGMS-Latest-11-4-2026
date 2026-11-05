import { query, pool } from "../config/db.js";

export const getStudentsBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const result = await query(
      "SELECT id, section_id, name, created_at FROM students WHERE section_id = $1 ORDER BY name ASC",
      [sectionId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const addStudent = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Student name is required" });
    }

    const result = await query(
      "INSERT INTO students (section_id, name) VALUES ($1, $2) RETURNING id, section_id, name, created_at",
      [sectionId, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const batchAddStudents = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { sectionId } = req.params;
    const { names } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: "Names array is required" });
    }

    await client.query("BEGIN");
    const insertedStudents = [];

    for (const rawName of names) {
      const name = typeof rawName === "string" ? rawName.trim() : "";
      if (name) {
        const resInsert = await client.query(
          "INSERT INTO students (section_id, name) VALUES ($1, $2) RETURNING id, section_id, name, created_at",
          [sectionId, name]
        );
        insertedStudents.push(resInsert.rows[0]);
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      success: true,
      count: insertedStudents.length,
      students: insertedStudents,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Student name is required" });
    }

    const result = await query(
      "UPDATE students SET name = $1 WHERE id = $2 AND section_id = $3 RETURNING id, section_id, name",
      [name.trim(), id, sectionId]
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
      "DELETE FROM students WHERE id = $1 AND section_id = $2 RETURNING id",
      [id, sectionId]
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
    await query("DELETE FROM students WHERE section_id = $1", [sectionId]);
    res.json({ success: true, message: `All students deleted for section ${sectionId}` });
  } catch (err) {
    next(err);
  }
};
