import crypto from "crypto";
import { pool } from "../config/db.js";

// Helper to shuffle arrays safely (Fisher-Yates)
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isAttemptToken = (token) => typeof token === "string" && /^[a-f0-9]{64}$/i.test(token);
const hashAttemptToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const getPublicAssessmentAvailability = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM assessments a
         WHERE a.status = 'published'
           AND (
             NOT EXISTS (
               SELECT 1
               FROM students st
               WHERE st.workspace_id = a.workspace_id
                 AND st.section_id = a.section_id
             )
             OR EXISTS (
               SELECT 1
               FROM students st
               WHERE st.workspace_id = a.workspace_id
                 AND st.section_id = a.section_id
                 AND NOT EXISTS (
                   SELECT 1
                   FROM assessment_submissions s
                   WHERE s.assessment_id = a.id
                     AND s.student_id = st.id
                     AND s.submitted_at IS NOT NULL
                 )
             )
           )
       ) AS available`,
    );
    res.json({ available: Boolean(rows[0]?.available) });
  } catch (err) {
    next(err);
  }
};

const validateStudentIdentity = async (database, assessment, studentId, studentName) => {
  const cleanedName = studentName.trim();
  if (cleanedName.length > 255) {
    return { error: { status: 400, message: "Student name must be 255 characters or fewer." } };
  }

  const { rows } = await database.query(
    `SELECT id, name FROM students
     WHERE workspace_id = $1 AND section_id = $2`,
    [assessment.workspace_id, assessment.section_id],
  );
  if (rows.length === 0) {
    return { studentId: studentId || null, studentName: cleanedName };
  }
  if (!studentId) {
    return { error: { status: 400, message: "Select your name from the enrolled student list before continuing." } };
  }

  const selectedStudent = rows.find((student) => String(student.id) === String(studentId));
  if (!selectedStudent) {
    return { error: { status: 403, message: "This student is not enrolled in the assessment section." } };
  }
  if (selectedStudent.name.trim().toLowerCase() !== cleanedName.toLowerCase()) {
    return { error: { status: 400, message: "Student name does not match the selected student." } };
  }
  return { studentId: String(selectedStudent.id), studentName: selectedStudent.name.trim() };
};

const sanitizeAttemptAnswers = (answers, questions) => {
  if (!isRecord(answers)) return null;
  const questionsById = new Map(
    questions.map((question, index) => [question.id || `q_${index + 1}`, question]),
  );
  const cleanedAnswers = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    const question = questionsById.get(questionId);
    if (!question) continue;

    if (question.type === "coding") {
      cleanedAnswers[questionId] = {
        code: typeof answer === "string"
          ? answer
          : isRecord(answer) && typeof answer.code === "string"
            ? answer.code
            : "",
      };
    } else {
      cleanedAnswers[questionId] = answer;
    }
  }

  return cleanedAnswers;
};

const sanitizeIntegrityLog = (integrityLog) => {
  if (!Array.isArray(integrityLog)) return [];
  return integrityLog
    .slice(-200)
    .filter((entry) => (
      isRecord(entry) &&
      ["tab_switch", "window_blur"].includes(entry.event) &&
      typeof entry.timestamp === "string" &&
      Number.isFinite(Date.parse(entry.timestamp))
    ))
    .map((entry) => ({
      event: entry.event,
      timestamp: new Date(entry.timestamp).toISOString(),
    }));
};

const safeEventCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(5000, Math.max(0, parsed)) : 0;
};

const loadAttempt = async (accessCode, attemptId, attemptToken) => {
  if (!isAttemptToken(attemptToken)) return null;
  const { rows } = await pool.query(
    `SELECT s.*, a.status AS assessment_status, a.questions AS assessment_questions,
            a.time_limit_minutes AS assessment_time_limit_minutes,
            a.passing_percentage AS assessment_passing_percentage,
            a.show_score_immediately AS assessment_show_score_immediately,
            a.section_id AS assessment_section_id,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.started_at))::int AS elapsed_seconds
     FROM assessments a
     JOIN assessment_submissions s ON s.assessment_id = a.id
     WHERE a.access_code = $1
       AND s.id = $2
       AND s.attempt_token_hash = $3
       AND s.submitted_at IS NULL`,
    [accessCode.trim().toUpperCase(), attemptId, hashAttemptToken(attemptToken)],
  );
  return rows[0] || null;
};

const getAttemptResponse = async (database, attemptId, attemptToken) => {
  const { rows } = await database.query(
    `SELECT s.id, s.answers, s.progress, s.started_at, s.saved_at,
            s.tab_switch_count, s.integrity_log,
            a.time_limit_minutes,
            CURRENT_TIMESTAMP AS server_time,
            CASE WHEN a.time_limit_minutes > 0
              THEN s.started_at + a.time_limit_minutes * INTERVAL '1 minute'
              ELSE NULL
            END AS expires_at
     FROM assessment_submissions s
     JOIN assessments a ON a.id = s.assessment_id
     WHERE s.id = $1`,
    [attemptId],
  );
  const attempt = rows[0];
  return {
    attempt_id: attempt.id,
    attempt_token: attemptToken,
    answers: attempt.answers || {},
    progress: attempt.progress || {},
    tab_switch_count: attempt.tab_switch_count || 0,
    integrity_log: attempt.integrity_log || [],
    started_at: attempt.started_at,
    saved_at: attempt.saved_at,
    server_time: attempt.server_time,
    expires_at: attempt.expires_at,
    time_limit_minutes: attempt.time_limit_minutes,
  };
};

export const startPublicAssessmentAttempt = async (req, res, next) => {
  let client;
  let lockKey;
  let lockAcquired = false;
  try {
    const { accessCode } = req.params;
    const { student_id: requestedStudentId, student_name, attempt_token: existingToken } = req.body;
    if (existingToken !== undefined && existingToken !== null && !isAttemptToken(existingToken)) {
      return res.status(400).json({ message: "The saved attempt token is invalid." });
    }
    if (typeof student_name !== "string" || !student_name.trim()) {
      return res.status(400).json({ message: "Student name is required." });
    }

    client = await pool.connect();
    const assessmentResult = await client.query(
      "SELECT * FROM assessments WHERE access_code = $1",
      [accessCode.trim().toUpperCase()],
    );
    if (assessmentResult.rowCount === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }
    const assessment = assessmentResult.rows[0];
    if (assessment.status !== "published") {
      return res.status(403).json({ message: "This assessment is not open for attempts." });
    }

    const identity = await validateStudentIdentity(
      client,
      assessment,
      requestedStudentId,
      student_name,
    );
    if (identity.error) {
      return res.status(identity.error.status).json({ message: identity.error.message });
    }

    const identityKey = identity.studentId
      ? `student:${identity.studentId}`
      : `name:${identity.studentName.toLowerCase()}`;
    lockKey = `${assessment.id}:${identityKey}`;
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey]);
    lockAcquired = true;

    const activeResult = await client.query(
      `SELECT id, attempt_token_hash
       FROM assessment_submissions
       WHERE assessment_id = $1
         AND submitted_at IS NULL
         AND (
           ($2::varchar IS NOT NULL AND student_id = $2)
           OR (student_id IS NULL AND LOWER(BTRIM(student_name)) = $3)
         )
       ORDER BY created_at DESC
       LIMIT 1`,
      [assessment.id, identity.studentId, identity.studentName.toLowerCase()],
    );
    if (activeResult.rowCount > 0) {
      const activeAttempt = activeResult.rows[0];
      if (!existingToken) {
        return res.status(409).json({
          message: "An attempt is already in progress. Resume it in the same browser session or ask your teacher for help.",
        });
      }
      if (hashAttemptToken(existingToken) !== activeAttempt.attempt_token_hash) {
        return res.status(403).json({ message: "The saved attempt token is invalid." });
      }
      return res.json(await getAttemptResponse(client, activeAttempt.id, existingToken));
    }

    const completedResult = await client.query(
      `SELECT id FROM assessment_submissions
       WHERE assessment_id = $1
         AND submitted_at IS NOT NULL
         AND (
           ($2::varchar IS NOT NULL AND student_id = $2)
           OR (student_id IS NULL AND LOWER(BTRIM(student_name)) = $3)
         )
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [assessment.id, identity.studentId, identity.studentName.toLowerCase()],
    );
    if (completedResult.rowCount > 0) {
      return res.status(409).json({
        message: "A submission for this student already exists for this assessment. Please contact your teacher if you need to update or review it.",
      });
    }

    const attemptToken = crypto.randomBytes(32).toString("hex");
    const created = await client.query(
      `INSERT INTO assessment_submissions (
        assessment_id, student_id, student_name, status, attempt_token_hash, progress
      ) VALUES ($1, $2, $3, 'in_progress', $4, '{}'::jsonb)
      RETURNING id`,
      [assessment.id, identity.studentId, identity.studentName, hashAttemptToken(attemptToken)],
    );
    res.status(201).json(await getAttemptResponse(client, created.rows[0].id, attemptToken));
  } catch (err) {
    next(err);
  } finally {
    if (client) {
      if (lockAcquired) {
        try {
          await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
        } catch {
          // Releasing the client also releases any remaining session-level lock.
        }
      }
      client.release();
    }
  }
};

export const savePublicAssessmentAttempt = async (req, res, next) => {
  try {
    const { accessCode, attemptId } = req.params;
    const { attempt_token, answers, progress, tab_switch_count, integrity_log } = req.body;
    const attempt = await loadAttempt(accessCode, attemptId, attempt_token);
    if (!attempt) {
      return res.status(403).json({ message: "Attempt token is invalid or this attempt is no longer active." });
    }
    if (attempt.assessment_status !== "published") {
      return res.status(403).json({ message: "This assessment is no longer accepting changes." });
    }
    const timeLimitSeconds = Number(attempt.assessment_time_limit_minutes) * 60;
    if (timeLimitSeconds > 0 && attempt.elapsed_seconds >= timeLimitSeconds) {
      return res.status(410).json({ message: "The time limit has elapsed. Submit to finalize the saved answers." });
    }

    const cleanedAnswers = answers === undefined
      ? attempt.answers || {}
      : sanitizeAttemptAnswers(answers, attempt.assessment_questions || []);
    if (!cleanedAnswers) {
      return res.status(400).json({ message: "Answers must be an object keyed by question ID." });
    }
    if (progress !== undefined && !isRecord(progress)) {
      return res.status(400).json({ message: "Progress must be an object." });
    }
    const cleanedLog = integrity_log === undefined
      ? attempt.integrity_log || []
      : sanitizeIntegrityLog(integrity_log);

    const updated = await pool.query(
      `UPDATE assessment_submissions
       SET answers = $1, progress = $2, tab_switch_count = $3, integrity_log = $4,
           time_spent_seconds = LEAST(
             GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::int),
             CASE WHEN $5 > 0 THEN $5 ELSE 2147483647 END
           ),
           saved_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND attempt_token_hash = $7 AND submitted_at IS NULL
       RETURNING saved_at`,
      [
        JSON.stringify(cleanedAnswers),
        JSON.stringify(progress === undefined ? attempt.progress || {} : progress),
        tab_switch_count === undefined ? attempt.tab_switch_count : safeEventCount(tab_switch_count),
        JSON.stringify(cleanedLog),
        timeLimitSeconds,
        attemptId,
        hashAttemptToken(attempt_token),
      ],
    );
    if (updated.rowCount === 0) {
      return res.status(409).json({ message: "This attempt was already submitted." });
    }
    res.json({ saved_at: updated.rows[0].saved_at });
  } catch (err) {
    next(err);
  }
};

export const getPublicAssessment = async (req, res, next) => {
  try {
    const { accessCode } = req.params;
    if (!accessCode || !accessCode.trim()) {
      return res.status(400).json({ message: "Access code is required." });
    }

    const { rows } = await pool.query(
      `SELECT a.id, a.type, a.title, a.subject, a.term, a.description,
              a.general_instructions, a.status, a.access_code,
              a.time_limit_minutes, a.passing_percentage,
              a.shuffle_questions, a.shuffle_choices,
              a.show_score_immediately, a.anti_cheat_monitoring,
              a.config, a.questions, a.section_id, a.workspace_id
       FROM assessments a
       WHERE a.access_code = $1`,
      [accessCode.trim().toUpperCase()],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Assessment not found. Please check your access link or code." });
    }

    const assessment = rows[0];

    if (assessment.status === "draft") {
      return res.status(403).json({
        message: "This assessment is currently in draft mode and not yet open for taking.",
      });
    }

    if (assessment.status === "closed") {
      return res.status(403).json({
        message: "This assessment is now closed and no longer accepting submissions.",
      });
    }

    // Fetch enrolled students for this section so students can select their name
    const studentsRes = await pool.query(
      `SELECT id, name FROM students
       WHERE workspace_id = $1 AND section_id = $2
       ORDER BY name ASC`,
      [assessment.workspace_id, assessment.section_id],
    );

    // Sanitize questions: REMOVE correct answers and answer keys so students cannot inspect payload!
    let sanitizedQuestions = (assessment.questions || []).map((q, idx) => {
      let options = q.options || [];
      if (assessment.shuffle_choices && Array.isArray(options) && options.length > 1) {
        options = shuffleArray(options);
      }

      return {
        id: q.id || `q_${idx + 1}`,
        type: q.type || "multiple_choice",
        part: q.part || "Part I",
        question: q.question || "",
        points: q.points !== undefined ? parseFloat(q.points) : 1,
        options: options.map((opt) => (typeof opt === "object" ? opt.text || "" : String(opt))),
        rubric: q.type === "essay" ? q.rubric : undefined,
        language: q.language || "web",
        starter_code: q.starter_code || "",
        execution_mode: q.execution_mode || (q.language === "web" || q.language === "html" ? "web_preview" : "test_cases"),
        test_cases: Array.isArray(q.test_cases)
          ? q.test_cases
              .filter((tc) => !tc.is_hidden)
              .map((tc) => ({
                id: tc.id || `tc_${Math.random().toString(36).substring(2, 6)}`,
                input: tc.input || "",
                expected_output: tc.expected_output || "",
                label: tc.label || "",
              }))
          : [],
      };
    });

    if (assessment.shuffle_questions && sanitizedQuestions.length > 1) {
      sanitizedQuestions = shuffleArray(sanitizedQuestions);
    }

    res.json({
      id: assessment.id,
      type: assessment.type,
      title: assessment.title,
      subject: assessment.subject,
      term: assessment.term,
      description: assessment.description,
      general_instructions: assessment.general_instructions,
      time_limit_minutes: assessment.time_limit_minutes,
      passing_percentage: assessment.passing_percentage,
      show_score_immediately: assessment.show_score_immediately,
      anti_cheat_monitoring: assessment.anti_cheat_monitoring,
      section_id: assessment.section_id,
      questions: sanitizedQuestions,
      students: studentsRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

export const submitPublicAssessment = async (req, res, next) => {
  try {
    const { accessCode } = req.params;
    const {
      attempt_id,
      attempt_token,
      answers: requestedAnswers = {},
      tab_switch_count: requestedTabSwitchCount,
      integrity_log: requestedIntegrityLog,
    } = req.body;

    if (!attempt_id || !attempt_token) {
      return res.status(400).json({ message: "A valid assessment attempt is required before submitting." });
    }

    const { rows } = await pool.query(
      `SELECT * FROM assessments WHERE access_code = $1`,
      [accessCode.trim().toUpperCase()],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const assessment = rows[0];

    if (assessment.status === "closed") {
      return res.status(403).json({ message: "This assessment is closed." });
    }
    if (assessment.status !== "published") {
      return res.status(403).json({ message: "This assessment is not open for submissions." });
    }

    const attempt = await loadAttempt(accessCode, attempt_id, attempt_token);
    if (!attempt || attempt.id !== attempt_id) {
      return res.status(403).json({ message: "Attempt token is invalid or this attempt is no longer active." });
    }

    const questions = assessment.questions || [];
    const timeLimitSeconds = Number(assessment.time_limit_minutes) * 60;
    const elapsedSeconds = Math.max(0, Number(attempt.elapsed_seconds) || 0);
    const deadlinePassed = timeLimitSeconds > 0 && elapsedSeconds >= timeLimitSeconds;
    const answers = deadlinePassed
      ? attempt.answers || {}
      : sanitizeAttemptAnswers(requestedAnswers, questions);
    if (!answers) {
      return res.status(400).json({ message: "Answers must be an object keyed by question ID." });
    }
    const tab_switch_count = deadlinePassed || requestedTabSwitchCount === undefined
      ? attempt.tab_switch_count
      : safeEventCount(requestedTabSwitchCount);
    const integrity_log = deadlinePassed || requestedIntegrityLog === undefined
      ? attempt.integrity_log || []
      : sanitizeIntegrityLog(requestedIntegrityLog);
    const time_spent_seconds = timeLimitSeconds > 0
      ? Math.min(elapsedSeconds, timeLimitSeconds)
      : elapsedSeconds;

    // Auto-grade objective questions
    let totalScore = 0;
    let totalPoints = 0;
    const gradingDetails = {};

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = q.id || `q_${i + 1}`;
      const qPoints = q.points !== undefined ? parseFloat(q.points) : 1;
      totalPoints += qPoints;

      const studentAnswer = answers[qId];
      const correctAnswer = q.correct_answer;

      if (q.type === "multiple_choice") {
        const isMatch =
          studentAnswer !== undefined &&
          String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();

        const earned = isMatch ? qPoints : 0;
        totalScore += earned;
        gradingDetails[qId] = {
          type: "multiple_choice",
          isCorrect: isMatch,
          pointsEarned: earned,
          maxPoints: qPoints,
          studentAnswer: studentAnswer || "",
          correctAnswer: assessment.show_score_immediately ? correctAnswer : undefined,
        };
      } else if (q.type === "true_false") {
        const isMatch =
          studentAnswer !== undefined &&
          String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();

        const earned = isMatch ? qPoints : 0;
        totalScore += earned;
        gradingDetails[qId] = {
          type: "true_false",
          isCorrect: isMatch,
          pointsEarned: earned,
          maxPoints: qPoints,
          studentAnswer: studentAnswer || "",
          correctAnswer: assessment.show_score_immediately ? correctAnswer : undefined,
        };
      } else if (q.type === "identification") {
        // Support multiple comma-separated or array of accepted answers
        let acceptedAnswers = [];
        if (Array.isArray(q.accepted_answers)) {
          acceptedAnswers = q.accepted_answers;
        } else if (typeof correctAnswer === "string") {
          acceptedAnswers = correctAnswer.split(",").map((s) => s.trim());
        }

        const normalizedStudentAns = studentAnswer ? String(studentAnswer).trim().toLowerCase() : "";
        const isMatch = acceptedAnswers.some(
          (ans) => String(ans).trim().toLowerCase() === normalizedStudentAns,
        );

        const earned = isMatch ? qPoints : 0;
        totalScore += earned;
        gradingDetails[qId] = {
          type: "identification",
          isCorrect: isMatch,
          pointsEarned: earned,
          maxPoints: qPoints,
          studentAnswer: studentAnswer || "",
          correctAnswer: assessment.show_score_immediately ? acceptedAnswers[0] : undefined,
        };
      } else if (q.type === "essay") {
        // Essay is pending manual evaluation
        gradingDetails[qId] = {
          type: "essay",
          isCorrect: null, // Pending teacher grading
          pointsEarned: 0,
          maxPoints: qPoints,
          studentAnswer: studentAnswer || "",
          needsManualGrading: true,
        };
      } else if (q.type === "coding") {
        const studentCode =
          typeof studentAnswer === "object" && studentAnswer !== null
            ? studentAnswer.code || ""
            : String(studentAnswer || "");

        gradingDetails[qId] = {
          type: "coding",
          language: q.language || "web",
          isCorrect: null,
          pointsEarned: 0,
          maxPoints: qPoints,
          studentAnswer: studentCode,
          needsManualGrading: true,
        };
      } else {
        // Fallback
        const isMatch =
          studentAnswer !== undefined &&
          String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
        const earned = isMatch ? qPoints : 0;
        totalScore += earned;
        gradingDetails[qId] = {
          type: q.type,
          isCorrect: isMatch,
          pointsEarned: earned,
          maxPoints: qPoints,
          studentAnswer: studentAnswer || "",
        };
      }
    }

    const percentage = totalPoints > 0 ? ((totalScore / totalPoints) * 100).toFixed(2) : 0;
    const hasPendingManualGrading = questions.some(
      (q, idx) =>
        q.type === "essay" ||
        (q.type === "coding" && gradingDetails[q.id || `q_${idx + 1}`]?.needsManualGrading),
    );
    const submissionStatus = hasPendingManualGrading ? "in_progress" : "submitted";

    const submissionResult = await pool.query(
      `UPDATE assessment_submissions
       SET submitted_at = CURRENT_TIMESTAMP,
           time_spent_seconds = $1,
           score = $2,
           total_points = $3,
           percentage = $4,
           tab_switch_count = $5,
           answers = $6,
           grading_details = $7,
           integrity_log = $8,
           status = $9,
           attempt_token_hash = NULL,
           saved_at = CURRENT_TIMESTAMP
       WHERE id = $10
         AND attempt_token_hash = $11
         AND submitted_at IS NULL
       RETURNING id`,
      [
        time_spent_seconds,
        totalScore,
        totalPoints,
        percentage,
        tab_switch_count,
        JSON.stringify(answers),
        JSON.stringify(gradingDetails),
        JSON.stringify(integrity_log),
        submissionStatus,
        attempt.id,
        hashAttemptToken(attempt_token),
      ],
    );
    if (submissionResult.rowCount === 0) {
      return res.status(409).json({ message: "This attempt was already submitted." });
    }

    res.status(201).json({
      message: "Assessment submitted successfully!",
      submissionId: submissionResult.rows[0].id,
      score: assessment.show_score_immediately && !hasPendingManualGrading ? totalScore : undefined,
      totalPoints: assessment.show_score_immediately && !hasPendingManualGrading ? totalPoints : undefined,
      percentage: assessment.show_score_immediately && !hasPendingManualGrading ? percentage : undefined,
      passed: assessment.show_score_immediately && !hasPendingManualGrading
        ? percentage >= assessment.passing_percentage
        : undefined,
      hasPendingReviews: hasPendingManualGrading,
      gradingDetails: assessment.show_score_immediately ? gradingDetails : undefined,
    });
  } catch (err) {
    next(err);
  }
};

export const submitPublicAssessmentAttempt = (req, res, next) => {
  req.body = { ...req.body, attempt_id: req.params.attemptId };
  return submitPublicAssessment(req, res, next);
};
