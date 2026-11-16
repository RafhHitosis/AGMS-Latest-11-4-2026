import { pool } from "../config/db.js";
import { generateAccessKey } from "../auth/accessKey.js";
import {
  hashRecoveryAnswer,
  isValidRecoveryAnswer,
  normalizeRecoveryAnswer,
  verifyRecoveryAnswer,
} from "../auth/adminRecovery.js";
import { getAdminRecoveryQuestion } from "../../shared/adminRecoveryQuestions.js";

const rollback = async (client) => {
  try {
    await client.query("ROLLBACK");
  } catch (error) {
    console.error("Failed to roll back admin recovery transaction:", error);
  }
};

const readRecoveryQuestions = (row) => {
  const first = getAdminRecoveryQuestion(row.question_1_id);
  const second = getAdminRecoveryQuestion(row.question_2_id);
  if (!first || !second) {
    throw new Error("Stored administrator recovery questions are invalid.");
  }
  return [first, second];
};

export const getPublicAdminRecoveryQuestions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT recovery.question_1_id, recovery.question_2_id
       FROM admin_recovery_questions AS recovery
       JOIN app_users AS admin ON admin.id = recovery.admin_user_id
       WHERE admin.role = 'admin' AND admin.is_active
       LIMIT 1`,
    );
    if (rows.length === 0) {
      res.json({ configured: false, questions: [] });
      return;
    }

    res.json({
      configured: true,
      questions: readRecoveryQuestions(rows[0]),
    });
  } catch (error) {
    next(error);
  }
};

export const setAdminRecoveryQuestions = async (req, res, next) => {
  const questions = req.body?.questions;
  if (
    !Array.isArray(questions) ||
    questions.length !== 2 ||
    !questions.every((item) =>
      item &&
      typeof item.questionId === "string" &&
      getAdminRecoveryQuestion(item.questionId) &&
      isValidRecoveryAnswer(item.answer)
    ) ||
    questions[0].questionId === questions[1].questionId ||
    normalizeRecoveryAnswer(questions[0].answer) === normalizeRecoveryAnswer(questions[1].answer)
  ) {
    res.status(400).json({
      error: "Choose two different questions and provide two different answers of at least three characters.",
    });
    return;
  }

  const firstQuestion = questions[0];
  const secondQuestion = questions[1];
  let firstHash;
  let secondHash;
  try {
    [firstHash, secondHash] = await Promise.all([
      hashRecoveryAnswer(firstQuestion.answer),
      hashRecoveryAnswer(secondQuestion.answer),
    ]);
  } catch (error) {
    next(error);
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO admin_recovery_questions (
         admin_user_id, question_1_id, answer_1_salt, answer_1_hash,
         question_2_id, answer_2_salt, answer_2_hash, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (admin_user_id) DO UPDATE SET
         question_1_id = EXCLUDED.question_1_id,
         answer_1_salt = EXCLUDED.answer_1_salt,
         answer_1_hash = EXCLUDED.answer_1_hash,
         question_2_id = EXCLUDED.question_2_id,
         answer_2_salt = EXCLUDED.answer_2_salt,
         answer_2_hash = EXCLUDED.answer_2_hash,
         failed_attempts = 0,
         attempt_window_started_at = CURRENT_TIMESTAMP,
         locked_until = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [
        req.user.id,
        firstQuestion.questionId,
        firstHash.salt,
        firstHash.hash,
        secondQuestion.questionId,
        secondHash.salt,
        secondHash.hash,
      ],
    );
    await client.query(
      `INSERT INTO account_security_events (actor_user_id, target_user_id, action)
       VALUES ($1, $1, 'admin_recovery_questions_updated')`,
      [req.user.id],
    );
    await client.query("COMMIT");
    res.json({ configured: true });
  } catch (error) {
    if (client) await rollback(client);
    next(error);
  } finally {
    client?.release();
  }
};

export const recoverAdminAccessKey = async (answers) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT admin.id,
              recovery.question_1_id, recovery.answer_1_salt, recovery.answer_1_hash,
              recovery.question_2_id, recovery.answer_2_salt, recovery.answer_2_hash,
              recovery.failed_attempts, recovery.attempt_window_started_at,
              recovery.locked_until
       FROM app_users AS admin
       JOIN admin_recovery_questions AS recovery ON recovery.admin_user_id = admin.id
       WHERE admin.role = 'admin' AND admin.is_active
       FOR UPDATE OF admin, recovery`,
    );
    const recovery = rows[0];
    if (!recovery) {
      await client.query("ROLLBACK");
      return { status: "unavailable" };
    }

    if (recovery.locked_until && new Date(recovery.locked_until).getTime() > Date.now()) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(recovery.locked_until).getTime() - Date.now()) / 1000),
      );
      await client.query("ROLLBACK");
      return { status: "locked", retryAfterSeconds };
    }

    const submittedAnswers = Array.isArray(answers) ? answers : [];
    const firstAnswer = submittedAnswers[0];
    const secondAnswer = submittedAnswers[1];
    const [firstMatches, secondMatches] = await Promise.all([
      verifyRecoveryAnswer(
        firstAnswer?.answer,
        recovery.answer_1_salt,
        recovery.answer_1_hash,
      ),
      verifyRecoveryAnswer(
        secondAnswer?.answer,
        recovery.answer_2_salt,
        recovery.answer_2_hash,
      ),
    ]);
    const questionIdsMatch =
      submittedAnswers.length === 2 &&
      firstAnswer?.questionId === recovery.question_1_id &&
      secondAnswer?.questionId === recovery.question_2_id;

    if (!questionIdsMatch || !firstMatches || !secondMatches) {
      const { rows: attemptRows } = await client.query(
        `UPDATE admin_recovery_questions
         SET failed_attempts = CASE
               WHEN attempt_window_started_at <= NOW() - INTERVAL '15 minutes' THEN 1
               ELSE failed_attempts + 1
             END,
             attempt_window_started_at = CASE
               WHEN attempt_window_started_at <= NOW() - INTERVAL '15 minutes' THEN NOW()
               ELSE attempt_window_started_at
             END,
             locked_until = CASE
               WHEN attempt_window_started_at <= NOW() - INTERVAL '15 minutes' THEN NULL
               WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
               ELSE NULL
             END
         WHERE admin_user_id = $1
         RETURNING failed_attempts, locked_until`,
        [recovery.id],
      );
      await client.query("COMMIT");
      const lockUntil = attemptRows[0]?.locked_until;
      if (lockUntil) {
        return {
          status: "locked",
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((new Date(lockUntil).getTime() - Date.now()) / 1000),
          ),
        };
      }
      return { status: "invalid" };
    }

    const newKey = generateAccessKey();
    await client.query(
      `UPDATE app_users
       SET access_key_id = $2, access_key_hash = $3, updated_at = NOW()
       WHERE id = $1`,
      [recovery.id, newKey.accessKeyId, newKey.accessKeyHash],
    );
    await client.query(
      `UPDATE admin_recovery_questions
       SET failed_attempts = 0,
           attempt_window_started_at = CURRENT_TIMESTAMP,
           locked_until = NULL
       WHERE admin_user_id = $1`,
      [recovery.id],
    );
    await client.query("DELETE FROM auth_sessions WHERE user_id = $1", [recovery.id]);
    await client.query(
      `INSERT INTO account_security_events (actor_user_id, target_user_id, action)
       VALUES (NULL, $1, 'admin_access_key_recovered')`,
      [recovery.id],
    );
    await client.query("COMMIT");
    return { status: "success", key: newKey };
  } catch (error) {
    if (client) await rollback(client);
    throw error;
  } finally {
    client?.release();
  }
};
