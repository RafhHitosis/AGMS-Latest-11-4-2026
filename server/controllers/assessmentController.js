import crypto from "crypto";
import { pool } from "../config/db.js";
import { DEFAULT_GRADE_CONFIG } from "../../shared/defaultGradeConfig.js";
import {
  getAssessmentExamGradeTarget,
  getAssessmentTermsForGradebookTerm,
  isValidAssessmentTerm,
} from "../../shared/assessmentTerms.js";

const generateAccessCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

const getWorkspaceId = (req) => req.user?.id || req.workspaceId;

const logAssessmentAuditEvent = async ({ action, actorUserId = null, actorUsername = "system", sectionId = null, statusCode = 200 }) => {
  try {
    await pool.query(
      `INSERT INTO audit_events (actor_user_id, actor_username, action, section_id, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorUserId, actorUsername, action, sectionId, statusCode],
    );
  } catch {
    // Intentionally swallow audit failures to avoid breaking assessment workflows.
  }
};

const toJsonParam = (val, defaultVal = {}) => {
  if (val === undefined || val === null) return JSON.stringify(defaultVal);
  if (typeof val === "string") {
    try {
      JSON.parse(val);
      return val;
    } catch {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
};

export const getAssessmentsBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { rows } = await pool.query(
      `SELECT a.*,
              COUNT(DISTINCT s.id)::int AS submission_count,
              COUNT(DISTINCT r.id)::int AS recitation_count
       FROM assessments a
       LEFT JOIN assessment_submissions s ON s.assessment_id = a.id
       LEFT JOIN recitation_logs r ON r.assessment_id = a.id
       WHERE a.workspace_id = $1 AND a.section_id = $2
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [workspaceId, sectionId],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createAssessment = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const {
      type = "quiz",
      title,
      subject = "",
      term = "midterm",
      description = "",
      general_instructions = "",
      time_limit_minutes = 0,
      passing_percentage = 50,
      shuffle_questions = false,
      shuffle_choices = false,
      show_score_immediately = true,
      anti_cheat_monitoring = true,
      config = {},
      questions = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Assessment title is required." });
    }

    if (!["exam", "quiz", "recitation"].includes(type)) {
      return res.status(400).json({ message: "Invalid assessment type." });
    }

    if (!isValidAssessmentTerm(term)) {
      return res.status(400).json({ message: "Invalid academic term." });
    }

    let accessCode = generateAccessCode();
    // Ensure unique access code
    for (let i = 0; i < 5; i++) {
      const existing = await pool.query(
        "SELECT 1 FROM assessments WHERE access_code = $1",
        [accessCode],
      );
      if (existing.rowCount === 0) break;
      accessCode = generateAccessCode();
    }

    const { rows } = await pool.query(
      `INSERT INTO assessments (
        workspace_id, section_id, type, title, subject, term,
        description, general_instructions, access_code, time_limit_minutes,
        passing_percentage, shuffle_questions, shuffle_choices,
        show_score_immediately, anti_cheat_monitoring, config, questions, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'draft')
      RETURNING *`,
      [
        workspaceId,
        sectionId,
        type,
        title.trim(),
        subject.trim(),
        term,
        description.trim(),
        general_instructions.trim(),
        accessCode,
        Math.max(0, parseInt(time_limit_minutes, 10) || 0),
        Math.min(100, Math.max(0, parseInt(passing_percentage, 10) || 50)),
        Boolean(shuffle_questions),
        Boolean(shuffle_choices),
        show_score_immediately !== false,
        anti_cheat_monitoring !== false,
        toJsonParam(config, {}),
        toJsonParam(Array.isArray(questions) ? questions : [], []),
      ],
    );

    await logAssessmentAuditEvent({
      action: "assessment_created",
      actorUserId: workspaceId,
      actorUsername: "teacher",
      sectionId,
      statusCode: 201,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const getAssessmentById = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { rows } = await pool.query(
      `SELECT a.*,
              COUNT(s.id)::int AS submission_count
       FROM assessments a
       LEFT JOIN assessment_submissions s ON s.assessment_id = a.id
       WHERE a.workspace_id = $1 AND a.section_id = $2 AND a.id = $3
       GROUP BY a.id`,
      [workspaceId, sectionId, id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateAssessment = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const {
      type,
      title,
      subject,
      term,
      description,
      general_instructions,
      status,
      time_limit_minutes,
      passing_percentage,
      shuffle_questions,
      shuffle_choices,
      show_score_immediately,
      anti_cheat_monitoring,
      config,
      questions,
    } = req.body;

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: "Title cannot be empty." });
    }
    if (type !== undefined && !["exam", "quiz", "recitation"].includes(type)) {
      return res.status(400).json({ message: "Invalid assessment type." });
    }
    if (term !== undefined && !isValidAssessmentTerm(term)) {
      return res.status(400).json({ message: "Invalid academic term." });
    }
    if (status !== undefined && !["draft", "published", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const existing = await pool.query(
      "SELECT * FROM assessments WHERE workspace_id = $1 AND section_id = $2 AND id = $3",
      [workspaceId, sectionId, id],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const current = existing.rows[0];

    const updatedTitle = title !== undefined ? title.trim() : current.title;
    const updatedType = type !== undefined ? type : current.type;
    const updatedTerm = term !== undefined ? term : current.term;
    const updatedStatus = status !== undefined ? status : current.status;

    const { rows } = await pool.query(
      `UPDATE assessments
       SET type = $1,
           title = $2,
           subject = $3,
           term = $4,
           description = $5,
           general_instructions = $6,
           status = $7,
           time_limit_minutes = $8,
           passing_percentage = $9,
           shuffle_questions = $10,
           shuffle_choices = $11,
           show_score_immediately = $12,
           anti_cheat_monitoring = $13,
           config = $14,
           questions = $15,
           updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $16 AND section_id = $17 AND id = $18
       RETURNING *`,
      [
        updatedType,
        updatedTitle,
        subject !== undefined ? subject.trim() : current.subject,
        updatedTerm,
        description !== undefined ? description.trim() : current.description,
        general_instructions !== undefined ? general_instructions.trim() : current.general_instructions,
        updatedStatus,
        time_limit_minutes !== undefined ? Math.max(0, parseInt(time_limit_minutes, 10) || 0) : current.time_limit_minutes,
        passing_percentage !== undefined ? Math.min(100, Math.max(0, parseInt(passing_percentage, 10) || 50)) : current.passing_percentage,
        shuffle_questions !== undefined ? Boolean(shuffle_questions) : current.shuffle_questions,
        shuffle_choices !== undefined ? Boolean(shuffle_choices) : current.shuffle_choices,
        show_score_immediately !== undefined ? Boolean(show_score_immediately) : current.show_score_immediately,
        anti_cheat_monitoring !== undefined ? Boolean(anti_cheat_monitoring) : current.anti_cheat_monitoring,
        config !== undefined ? toJsonParam(config, {}) : toJsonParam(current.config, {}),
        questions !== undefined ? toJsonParam(questions, []) : toJsonParam(current.questions, []),
        workspaceId,
        sectionId,
        id,
      ],
    );

    await logAssessmentAuditEvent({
      action: `assessment_updated:${updatedStatus}`,
      actorUserId: workspaceId,
      actorUsername: "teacher",
      sectionId,
      statusCode: 200,
    });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteAssessment = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const result = await pool.query(
      "DELETE FROM assessments WHERE workspace_id = $1 AND section_id = $2 AND id = $3 RETURNING id",
      [workspaceId, sectionId, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    await logAssessmentAuditEvent({
      action: "assessment_deleted",
      actorUserId: workspaceId,
      actorUsername: "teacher",
      sectionId,
      statusCode: 200,
    });

    res.json({ message: "Assessment deleted successfully.", id });
  } catch (err) {
    next(err);
  }
};

export const getAssessmentSubmissions = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const check = await pool.query(
      "SELECT 1 FROM assessments WHERE workspace_id = $1 AND section_id = $2 AND id = $3",
      [workspaceId, sectionId, id],
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const { rows } = await pool.query(
      `SELECT id, assessment_id, student_id, student_name, started_at, submitted_at,
              time_spent_seconds, score, total_points, percentage, tab_switch_count,
              fullscreen_exit_count, answers, grading_details, integrity_log, status,
              created_at, saved_at
       FROM assessment_submissions
       WHERE assessment_id = $1
       ORDER BY submitted_at DESC, created_at DESC`,
      [id],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const gradeSubmission = async (req, res, next) => {
  try {
    const { sectionId, id, submissionId } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const { score, grading_details, status = "graded" } = req.body;

    if (!["submitted", "graded"].includes(status)) {
      return res.status(400).json({ message: "Invalid grading status." });
    }

    const check = await pool.query(
      "SELECT a.id FROM assessments a WHERE a.workspace_id = $1 AND a.section_id = $2 AND a.id = $3",
      [workspaceId, sectionId, id],
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const subQuery = await pool.query(
      "SELECT * FROM assessment_submissions WHERE id = $1 AND assessment_id = $2",
      [submissionId, id],
    );
    if (subQuery.rowCount === 0) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const currentSub = subQuery.rows[0];
    const totalPoints = parseFloat(currentSub.total_points);
    const newScore = score !== undefined ? parseFloat(score) : parseFloat(currentSub.score);
    if (!Number.isFinite(totalPoints) || totalPoints < 0) {
      return res.status(409).json({ message: "Submission has invalid total points and cannot be graded." });
    }
    if (!Number.isFinite(newScore) || newScore < 0 || newScore > totalPoints) {
      return res.status(400).json({ message: `Score must be between 0 and ${totalPoints}.` });
    }
    const percentage = totalPoints > 0 ? ((newScore / totalPoints) * 100).toFixed(2) : 0;

    const { rows } = await pool.query(
      `UPDATE assessment_submissions
       SET score = $1,
           percentage = $2,
           grading_details = $3,
           status = $4
       WHERE id = $5
       RETURNING *`,
      [
        newScore,
        percentage,
        grading_details !== undefined ? toJsonParam(grading_details, {}) : toJsonParam(currentSub.grading_details, {}),
        status,
        submissionId,
      ],
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const syncAssessmentToGrades = async (req, res, next) => {
  const { sectionId, id } = req.params;
  const workspaceId = getWorkspaceId(req);

  if (!workspaceId) {
    return res.status(401).json({ message: "Authentication required." });
  }
  const { term, targetColumnKey } = req.body;

  if (!term || !["midterm", "finals"].includes(term)) {
    return res.status(400).json({ message: "Valid term ('midterm' or 'finals') is required." });
  }

  let client;
  try {
    client = await pool.connect();
    const assessmentRes = await client.query(
      "SELECT * FROM assessments WHERE workspace_id = $1 AND section_id = $2 AND id = $3",
      [workspaceId, sectionId, id],
    );
    if (assessmentRes.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const assessment = assessmentRes.rows[0];
    const examGradeTarget = assessment.type === "exam"
      ? getAssessmentExamGradeTarget(assessment.term)
      : null;
    const gradebookTerm = examGradeTarget?.gradebookTerm || term;
    const gradeConfigRes = await client.query(
      "SELECT config FROM grade_configs WHERE workspace_id = $1 AND section_id = $2 AND term = $3",
      [workspaceId, sectionId, gradebookTerm],
    );
    const gradeConfig = gradeConfigRes.rows[0]?.config || DEFAULT_GRADE_CONFIG;
    let destination;
    let targetMax;

    if (assessment.type === "exam") {
      destination = examGradeTarget?.scoreKey || "me";
      targetMax = Number(gradeConfig[examGradeTarget?.maxKey || "me_max"]) || 0;
    } else if (assessment.type === "quiz") {
      const quizItem = (gradeConfig.quiz_items || []).find(
        (item) => item.id === targetColumnKey,
      );
      if (!quizItem) {
        return res.status(400).json({
          message: "Choose a quiz column that exists in this term's gradebook.",
        });
      }
      destination = quizItem.id;
      targetMax = Number(quizItem.max) || 0;
    } else if (assessment.type === "recitation") {
      destination = "rt";
      targetMax = Number(gradeConfig.rt_max) || 0;
    } else {
      return res.status(400).json({ message: "This assessment type cannot be synced to grades." });
    }

    if (targetMax <= 0) {
      return res.status(400).json({
        message: "Set a positive maximum score for the target gradebook column before syncing.",
      });
    }

    const studentsRes = await client.query(
      "SELECT id, name FROM students WHERE workspace_id = $1 AND section_id = $2",
      [workspaceId, sectionId],
    );
    const studentIds = new Set(studentsRes.rows.map((student) => String(student.id)));
    const studentIdsByName = new Map();
    for (const student of studentsRes.rows) {
      const name = student.name.trim().toLowerCase();
      if (studentIdsByName.has(name)) {
        studentIdsByName.set(name, null);
      } else {
        studentIdsByName.set(name, String(student.id));
      }
    }

    const resolveStudentId = (row) => {
      const idFromRoster = row.student_id && String(row.student_id);
      if (idFromRoster && studentIds.has(idFromRoster)) return idFromRoster;
      const name = row.student_name?.trim().toLowerCase();
      return name ? studentIdsByName.get(name) || null : null;
    };

    let gradeEntries;
    if (assessment.type === "recitation") {
      const assessmentTerms = getAssessmentTermsForGradebookTerm(term);
      const onlineScoresRes = await client.query(
        `SELECT DISTINCT ON (
                  sub.assessment_id,
                  COALESCE(sub.student_id::text, lower(trim(sub.student_name)))
                )
                sub.student_id, sub.student_name, sub.score
         FROM assessment_submissions sub
         JOIN assessments a ON a.id = sub.assessment_id
         WHERE a.workspace_id = $1
           AND a.section_id = $2
           AND a.term = ANY($3::varchar[])
           AND a.type = 'recitation'
           AND sub.status IN ('submitted', 'graded')
         ORDER BY sub.assessment_id,
                  COALESCE(sub.student_id::text, lower(trim(sub.student_name))),
                  sub.submitted_at DESC`,
        [workspaceId, sectionId, assessmentTerms],
      );
      const inPersonScoresRes = await client.query(
        `SELECT r.student_id, r.student_name, r.score
         FROM recitation_logs r
         JOIN assessments a ON a.id = r.assessment_id
         WHERE a.workspace_id = $1
           AND a.section_id = $2
           AND a.term = ANY($3::varchar[])
           AND a.type = 'recitation'`,
        [workspaceId, sectionId, assessmentTerms],
      );

      const pointsByStudent = new Map();
      for (const score of [...onlineScoresRes.rows, ...inPersonScoresRes.rows]) {
        const studentId = resolveStudentId(score);
        if (!studentId) continue;
        const points = Math.max(0, Number(score.score) || 0);
        pointsByStudent.set(studentId, (pointsByStudent.get(studentId) || 0) + points);
      }
      gradeEntries = [...pointsByStudent].map(([studentId, points]) => ({
        studentId,
        score: Math.min(points, targetMax),
      }));
    } else {
      const submissionsRes = await client.query(
        `SELECT DISTINCT ON (
                  COALESCE(student_id::text, lower(trim(student_name)))
                )
                student_id, student_name, score, total_points
         FROM assessment_submissions
         WHERE assessment_id = $1 AND status IN ('submitted', 'graded')
         ORDER BY COALESCE(student_id::text, lower(trim(student_name))),
                  submitted_at DESC`,
        [id],
      );
      gradeEntries = submissionsRes.rows.flatMap((submission) => {
        const studentId = resolveStudentId(submission);
        if (!studentId) return [];
        const earned = Math.max(0, Number(submission.score) || 0);
        const total = Number(submission.total_points);
        const scaledScore = total > 0 ? (earned / total) * targetMax : earned;
        return [{
          studentId,
          score: Math.min(scaledScore, targetMax),
        }];
      });
    }

    if (gradeEntries.length === 0) {
      return res.status(400).json({
        message: assessment.type === "recitation"
          ? "No recorded online or in-person recitation scores are available to sync for this term."
          : "No submitted responses from enrolled students are available to sync.",
      });
    }

    await client.query("BEGIN");

    for (const entry of gradeEntries) {
      const existingGrade = await client.query(
        "SELECT scores FROM grades WHERE workspace_id = $1 AND section_id = $2 AND term = $3 AND student_id = $4",
        [workspaceId, sectionId, gradebookTerm, entry.studentId],
      );
      const currentScores = existingGrade.rowCount > 0
        ? (existingGrade.rows[0].scores || {})
        : {};
      if (assessment.type === "quiz") {
        currentScores.quizzes = {
          ...(currentScores.quizzes || {}),
          [destination]: Number(entry.score.toFixed(2)),
        };
      } else {
        currentScores[destination] = Number(entry.score.toFixed(2));
      }

      await client.query(
        `INSERT INTO grades (workspace_id, section_id, term, student_id, scores)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (workspace_id, section_id, term, student_id)
         DO UPDATE SET scores = $5, updated_at = CURRENT_TIMESTAMP`,
        [workspaceId, sectionId, gradebookTerm, entry.studentId, JSON.stringify(currentScores)],
      );
    }

    await client.query("COMMIT");
    res.json({
      message: `Successfully synced ${gradeEntries.length} student scores into ${gradebookTerm} (${assessment.type === "quiz" ? destination : assessment.type === "exam" ? destination.toUpperCase() : "RT"}).`,
      syncedCount: gradeEntries.length,
    });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Ignore rollback failure if already terminated
      }
    }
    next(err);
  } finally {
    if (client) client.release();
  }
};

export const getRecitationLogs = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const check = await pool.query(
      "SELECT 1 FROM assessments WHERE workspace_id = $1 AND section_id = $2 AND id = $3",
      [workspaceId, sectionId, id],
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const { rows } = await pool.query(
      `SELECT * FROM recitation_logs
       WHERE assessment_id = $1
       ORDER BY recorded_at DESC`,
      [id],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const recordRecitationScore = async (req, res, next) => {
  try {
    const { sectionId, id } = req.params;
    const workspaceId = getWorkspaceId(req);

    if (!workspaceId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const { student_id, student_name, score, max_score = 10, topic_prompt = "", notes = "", criteria_scores = {} } = req.body;

    if (!student_id || !student_name) {
      return res.status(400).json({ message: "Student ID and name are required." });
    }

    const check = await pool.query(
      "SELECT 1 FROM assessments WHERE workspace_id = $1 AND section_id = $2 AND id = $3",
      [workspaceId, sectionId, id],
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const { rows } = await pool.query(
      `INSERT INTO recitation_logs (
        assessment_id, student_id, student_name, score, max_score,
        topic_prompt, notes, criteria_scores
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        student_id,
        student_name.trim(),
        parseFloat(score) || 0,
        parseFloat(max_score) || 10,
        topic_prompt.trim(),
        notes.trim(),
        JSON.stringify(criteria_scores || {}),
      ],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};
