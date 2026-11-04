import { query, pool } from "../config/db.js";

const DEFAULT_GRADE_CONFIG = {
  pe_max: 0,
  me_max: 50,
  plus_max: 0,
  minus_max: 0,
  quiz_items: [
    { id: "HQ1", name: "HQ1", max: 100 },
    { id: "HQ2", name: "HQ2", max: 25 },
    { id: "LA1", name: "LA1", max: 50 },
    { id: "LA2", name: "LA2", max: 50 },
  ],
  rt_max: 50,
  at_max: 36,
  transmutation: {
    me_high: 100,
    me_low: 50,
    quiz_high: 100,
    quiz_low: 50,
    rec_high: 95,
    rec_low: 70,
    att_high: 95,
    att_low: 70,
  },
  weights: {
    me: 0.40,
    quiz: 0.25,
    rec: 0.25,
    dep: 0.05,
    att: 0.05,
  },
};

export const getGradeData = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const term = req.query.term || "midterm";

    // 1. Get students for this section
    const studentsRes = await query(
      "SELECT id, section_id, name FROM students WHERE section_id = $1 ORDER BY name ASC",
      [sectionId]
    );

    // 2. Get saved grade config (or defaults)
    const configRes = await query(
      "SELECT config FROM grade_configs WHERE section_id = $1 AND term = $2",
      [sectionId, term]
    );

    const config = configRes.rows.length > 0 ? configRes.rows[0].config : DEFAULT_GRADE_CONFIG;

    // 3. Get saved student grade scores
    const gradesRes = await query(
      "SELECT student_id, scores FROM grades WHERE section_id = $1 AND term = $2",
      [sectionId, term]
    );

    const gradesMap = {};
    for (const row of gradesRes.rows) {
      gradesMap[row.student_id] = row.scores;
    }

    // 4. Get attendance summary (count of absences to derive present sessions)
    const attendanceRes = await query(
      "SELECT student_id, COUNT(*) as absences_count FROM attendance WHERE section_id = $1 GROUP BY student_id",
      [sectionId]
    );
    const absencesMap = {};
    for (const row of attendanceRes.rows) {
      absencesMap[row.student_id] = parseInt(row.absences_count, 10);
    }

    res.json({
      sectionId,
      term,
      students: studentsRes.rows,
      config,
      grades: gradesMap,
      absences: absencesMap,
    });
  } catch (err) {
    next(err);
  }
};

export const saveGradeConfig = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { term = "midterm", config } = req.body;

    if (!config) {
      return res.status(400).json({ error: "Config object is required" });
    }

    const result = await query(
      `INSERT INTO grade_configs (section_id, term, config, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (section_id, term)
       DO UPDATE SET config = $3::jsonb, updated_at = NOW()
       RETURNING config`,
      [sectionId, term, JSON.stringify(config)]
    );

    res.json({ success: true, config: result.rows[0].config });
  } catch (err) {
    next(err);
  }
};

export const updateStudentScore = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { term = "midterm", studentId, scores } = req.body;

    if (!studentId || !scores) {
      return res.status(400).json({ error: "studentId and scores are required" });
    }

    const result = await query(
      `INSERT INTO grades (section_id, term, student_id, scores, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (section_id, term, student_id)
       DO UPDATE SET scores = COALESCE(grades.scores, '{}'::jsonb) || $4::jsonb, updated_at = NOW()
       RETURNING student_id, scores`,
      [sectionId, term, studentId, JSON.stringify(scores)]
    );

    res.json({ success: true, grade: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const batchUpdateScores = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { sectionId } = req.params;
    const { term = "midterm", grades } = req.body; // grades: { [studentId]: scores }

    if (!grades || typeof grades !== "object") {
      return res.status(400).json({ error: "grades object is required" });
    }

    await client.query("BEGIN");

    for (const [studentId, scores] of Object.entries(grades)) {
      await client.query(
        `INSERT INTO grades (section_id, term, student_id, scores, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())
         ON CONFLICT (section_id, term, student_id)
         DO UPDATE SET scores = COALESCE(grades.scores, '{}'::jsonb) || $4::jsonb, updated_at = NOW()`,
        [sectionId, term, studentId, JSON.stringify(scores || {})]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, count: Object.keys(grades).length });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

export const resetGrades = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const term = req.query.term;

    if (term) {
      await query("DELETE FROM grades WHERE section_id = $1 AND term = $2", [sectionId, term]);
    } else {
      await query("DELETE FROM grades WHERE section_id = $1", [sectionId]);
    }

    res.json({ success: true, message: `Grades reset for section ${sectionId}` });
  } catch (err) {
    next(err);
  }
};
