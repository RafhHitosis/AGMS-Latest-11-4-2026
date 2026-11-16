import { query } from "../config/db.js";
import { isValidGradeTerm, validateGradeConfiguration, validateGradeScores } from "../../shared/gradeValidation.js";
import { DEFAULT_GRADE_CONFIG } from "../../shared/defaultGradeConfig.js";

export const getGradeData = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const term = req.query.term ?? "midterm";
    if (!isValidGradeTerm(term)) {
      return res.status(400).json({ error: "Term must be midterm, finals, or semestral." });
    }

    const [studentsRes, configRes, gradesRes] = await Promise.all([
      query(
        "SELECT id, section_id, name FROM students WHERE workspace_id = $1 AND section_id = $2 ORDER BY name ASC",
        [req.user.id, sectionId]
      ),
      query(
        "SELECT config FROM grade_configs WHERE workspace_id = $1 AND section_id = $2 AND term = $3",
        [req.user.id, sectionId, term]
      ),
      query(
        "SELECT student_id, scores FROM grades WHERE workspace_id = $1 AND section_id = $2 AND term = $3",
        [req.user.id, sectionId, term]
      ),
    ]);

    const config = configRes.rows.length > 0 ? configRes.rows[0].config : DEFAULT_GRADE_CONFIG;

    const gradesMap = {};
    for (const row of gradesRes.rows) {
      gradesMap[row.student_id] = row.scores;
    }

    res.json({
      sectionId,
      term,
      students: studentsRes.rows,
      config,
      grades: gradesMap,
    });
  } catch (err) {
    next(err);
  }
};

export const saveGradeConfig = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { term = "midterm", config } = req.body || {};

    if (!isValidGradeTerm(term)) {
      return res.status(400).json({ error: "Term must be midterm, finals, or semestral." });
    }
    const validationError = validateGradeConfiguration(config);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await query(
      `INSERT INTO grade_configs (workspace_id, section_id, term, config, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (workspace_id, section_id, term)
       DO UPDATE SET config = $4::jsonb, updated_at = NOW()
       RETURNING config`,
      [req.user.id, sectionId, term, JSON.stringify(config)]
    );

    res.json({ success: true, config: result.rows[0].config });
  } catch (err) {
    next(err);
  }
};

export const updateStudentScore = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { term = "midterm", studentId, scores } = req.body || {};

    if (!isValidGradeTerm(term)) {
      return res.status(400).json({ error: "Term must be midterm, finals, or semestral." });
    }
    if (typeof studentId !== "string" || studentId.length === 0 || studentId.length > 50) {
      return res.status(400).json({ error: "A valid studentId is required." });
    }
    const validationError = validateGradeScores(scores);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await query(
      `INSERT INTO grades (workspace_id, section_id, term, student_id, scores, updated_at)
       SELECT students.workspace_id, students.section_id, $3, students.id, $5::jsonb, NOW()
       FROM students
       WHERE students.workspace_id = $1 AND students.section_id = $2 AND students.id = $4
       ON CONFLICT (workspace_id, section_id, term, student_id)
       DO UPDATE SET scores = COALESCE(grades.scores, '{}'::jsonb) || $5::jsonb, updated_at = NOW()
       RETURNING student_id, scores`,
      [req.user.id, sectionId, term, studentId, JSON.stringify(scores)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found in this section." });
    }

    res.json({ success: true, grade: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const batchUpdateScores = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { term = "midterm", grades } = req.body || {}; // grades: { [studentId]: scores }

    if (!isValidGradeTerm(term)) {
      return res.status(400).json({ error: "Term must be midterm, finals, or semestral." });
    }
    if (grades === null || typeof grades !== "object" || Array.isArray(grades)) {
      return res.status(400).json({ error: "Grades must be an object keyed by student ID." });
    }

    const entries = Object.entries(grades);
    if (entries.length === 0) {
      return res.status(400).json({ error: "At least one student score update is required." });
    }
    for (const [studentId, scores] of entries) {
      if (studentId.length === 0 || studentId.length > 50) {
        return res.status(400).json({ error: "A valid studentId is required for every score update." });
      }
      const validationError = validateGradeScores(scores);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
    }

    const studentIds = entries.map(([studentId]) => studentId);
    const sectionStudents = await query(
      "SELECT id FROM students WHERE workspace_id = $1 AND section_id = $2 AND id = ANY($3::varchar[])",
      [req.user.id, sectionId, studentIds]
    );
    if (sectionStudents.rows.length !== studentIds.length) {
      return res.status(404).json({ error: "One or more students were not found in this section." });
    }

    const result = await query(
      `INSERT INTO grades (workspace_id, section_id, term, student_id, scores, updated_at)
       SELECT $1, $2, $3, batch.student_id, batch.scores, NOW()
       FROM jsonb_each($4::jsonb) AS batch(student_id, scores)
       ON CONFLICT (workspace_id, section_id, term, student_id)
       DO UPDATE SET scores = COALESCE(grades.scores, '{}'::jsonb) || EXCLUDED.scores, updated_at = NOW()
       RETURNING student_id`,
      [req.user.id, sectionId, term, JSON.stringify(grades)]
    );
    res.json({ success: true, count: result.rows.length });
  } catch (err) {
    next(err);
  }
};

export const resetGrades = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const term = req.query.term;

    if (term !== undefined && !isValidGradeTerm(term)) {
      return res.status(400).json({ error: "Term must be midterm, finals, or semestral." });
    }
    if (term) {
      await query("DELETE FROM grades WHERE workspace_id = $1 AND section_id = $2 AND term = $3", [req.user.id, sectionId, term]);
    } else {
      await query("DELETE FROM grades WHERE workspace_id = $1 AND section_id = $2", [req.user.id, sectionId]);
    }

    res.json({ success: true, message: `Grades reset for section ${sectionId}` });
  } catch (err) {
    next(err);
  }
};
