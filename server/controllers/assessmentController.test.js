import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import * as dbModule from "../config/db.js";
import {
  getAssessmentsBySection,
  createAssessment,
  gradeSubmission,
  updateAssessment,
  syncAssessmentToGrades,
} from "./assessmentController.js";
import {
  getPublicAssessmentAvailability,
  getPublicAssessment,
  savePublicAssessmentAttempt,
  submitPublicAssessment,
  submitPublicAssessmentAttempt,
  startPublicAssessmentAttempt,
} from "./publicAssessmentController.js";

const invoke = async (handler, req) => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
  let nextCalled = false;
  await handler(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
};

const mockAssessmentSyncDatabase = ({
  assessment,
  gradeConfig,
  students,
  submissions = [],
  onlineRecitationScores = [],
  inPersonRecitationScores = [],
  existingScores = {},
}) => {
  const originalConnect = dbModule.pool.connect;
  const writes = [];
  const gradeConfigTerms = [];
  const gradeWriteTerms = [];
  const queriedRecitationTerms = [];
  dbModule.pool.connect = async () => ({
    async query(sql, params = []) {
      const statement = String(sql);
      let rows = [];

      if (statement.includes("SELECT * FROM assessments")) {
        rows = assessment ? [assessment] : [];
      } else if (statement.includes("SELECT config FROM grade_configs")) {
        gradeConfigTerms.push(params[2]);
        rows = gradeConfig ? [{ config: gradeConfig }] : [];
      } else if (statement.includes("SELECT id, name FROM students")) {
        rows = students;
      } else if (statement.includes("FROM assessment_submissions sub")) {
        queriedRecitationTerms.push(params[2]);
        rows = onlineRecitationScores;
      } else if (statement.includes("FROM recitation_logs r")) {
        queriedRecitationTerms.push(params[2]);
        rows = inPersonRecitationScores;
      } else if (statement.includes("FROM assessment_submissions")) {
        rows = submissions;
      } else if (statement.includes("SELECT scores FROM grades")) {
        const scores = existingScores[params[3]];
        rows = scores ? [{ scores }] : [];
      } else if (statement.includes("INSERT INTO grades")) {
        gradeWriteTerms.push(params[2]);
        writes.push({ studentId: params[3], scores: JSON.parse(params[4]) });
      } else if (!["BEGIN", "COMMIT", "ROLLBACK"].includes(statement)) {
        throw new Error(`Unexpected test query: ${statement}`);
      }

      return { rows, rowCount: rows.length };
    },
    release() {},
  });

  return {
    writes,
    gradeConfigTerms,
    gradeWriteTerms,
    queriedRecitationTerms,
    restore() {
      dbModule.pool.connect = originalConnect;
    },
  };
};

test("public assessment availability is true only when an open published assessment exists", async () => {
  const originalQuery = dbModule.pool.query;
  let available = true;
  let capturedSql = "";
  dbModule.pool.query = async (sql) => {
    capturedSql = String(sql);
    return { rows: [{ available }] };
  };

  try {
    const openResult = await invoke(getPublicAssessmentAvailability, { params: {} });
    assert.deepEqual(openResult.res.body, { available: true });

    available = false;
    const closedResult = await invoke(getPublicAssessmentAvailability, { params: {} });
    assert.deepEqual(closedResult.res.body, { available: false });
    assert.match(capturedSql, /a\.status = 'published'/);
    assert.match(capturedSql, /s\.submitted_at IS NOT NULL/);
  } finally {
    dbModule.pool.query = originalQuery;
  }
});

test("assessment lists count online submissions and live recitations without join duplication", async () => {
  const originalQuery = dbModule.pool.query;
  let capturedSql = "";
  dbModule.pool.query = async (sql) => {
    capturedSql = String(sql);
    return { rows: [] };
  };

  try {
    const result = await invoke(getAssessmentsBySection, {
      params: { sectionId: "1A" },
      user: { id: "00000000-0000-0000-0000-000000000001" },
    });

    assert.equal(result.res.statusCode, null);
    assert.deepEqual(result.res.body, []);
    assert.match(capturedSql, /COUNT\(DISTINCT s\.id\)/);
    assert.match(capturedSql, /COUNT\(DISTINCT r\.id\)/);
  } finally {
    dbModule.pool.query = originalQuery;
  }
});

test("assessment creation rejects missing workspace, blank title, invalid type, or invalid term", async () => {
  // Missing workspace
  const noAuth = await invoke(createAssessment, {
    params: { sectionId: "1A" },
    body: { title: "Quiz 1", type: "quiz", term: "midterm" },
  });
  assert.equal(noAuth.res.statusCode, 401);

  // Missing title
  const noTitle = await invoke(createAssessment, {
    params: { sectionId: "1A" },
    user: { id: "00000000-0000-0000-0000-000000000001" },
    body: { title: "   ", type: "quiz", term: "midterm" },
  });
  assert.equal(noTitle.res.statusCode, 400);

  // Invalid type
  const badType = await invoke(createAssessment, {
    params: { sectionId: "1A" },
    user: { id: "00000000-0000-0000-0000-000000000001" },
    body: { title: "Valid Title", type: "invalid_type", term: "midterm" },
  });
  assert.equal(badType.res.statusCode, 400);

  // Invalid term
  const badTerm = await invoke(createAssessment, {
    params: { sectionId: "1A" },
    user: { id: "00000000-0000-0000-0000-000000000001" },
    body: { title: "Valid Title", type: "quiz", term: "fourth_quarter" },
  });
  assert.equal(badTerm.res.statusCode, 400);
});

test("assessment sync to grades requires a valid term", async () => {
  const noTerm = await invoke(syncAssessmentToGrades, {
    params: { sectionId: "1A", id: "00000000-0000-0000-0000-000000000001" },
    user: { id: "00000000-0000-0000-0000-000000000001" },
    body: { targetColumnKey: "HQ1" },
  });
  assert.equal(noTerm.res.statusCode, 400);
});

test("quiz scores sync into the selected configured gradebook quiz column and scale to its maximum", async () => {
  const database = mockAssessmentSyncDatabase({
    assessment: { type: "quiz" },
    gradeConfig: {
      quiz_items: [
        { id: "quiz-a", name: "Quiz 1", max: 10 },
        { id: "quiz-b", name: "Quiz 2", max: 20 },
      ],
    },
    students: [{ id: "student-1", name: "Student One" }],
    submissions: [{
      student_id: "student-1",
      student_name: "Student One",
      score: 8,
      total_points: 20,
    }],
    existingScores: {
      "student-1": { me: 42, quizzes: { "quiz-a": 5 } },
    },
  });

  try {
    const result = await invoke(syncAssessmentToGrades, {
      params: { sectionId: "1A", id: "assessment-1" },
      user: { id: "workspace-1" },
      body: { term: "midterm", targetColumnKey: "quiz-b" },
    });

    assert.equal(result.res.statusCode, null);
    assert.deepEqual(database.writes, [{
      studentId: "student-1",
      scores: { me: 42, quizzes: { "quiz-a": 5, "quiz-b": 8 } },
    }]);
  } finally {
    database.restore();
  }
});

test("quiz sync rejects targets that are not configured in the selected term", async () => {
  const database = mockAssessmentSyncDatabase({
    assessment: { type: "quiz" },
    gradeConfig: { quiz_items: [{ id: "quiz-1", name: "Quiz 1", max: 10 }] },
    students: [],
  });

  try {
    const result = await invoke(syncAssessmentToGrades, {
      params: { sectionId: "1A", id: "assessment-1" },
      user: { id: "workspace-1" },
      body: { term: "midterm", targetColumnKey: "not-a-grade-column" },
    });

    assert.equal(result.res.statusCode, 400);
    assert.equal(database.writes.length, 0);
  } finally {
    database.restore();
  }
});

test("exam scores sync into the ME column scaled to the configured maximum", async () => {
  const database = mockAssessmentSyncDatabase({
    assessment: { type: "exam" },
    gradeConfig: { me_max: 50 },
    students: [{ id: "student-1", name: "Student One" }],
    submissions: [{
      student_id: "student-1",
      student_name: "Student One",
      score: 15,
      total_points: 30,
    }],
  });

  try {
    const result = await invoke(syncAssessmentToGrades, {
      params: { sectionId: "1A", id: "assessment-1" },
      user: { id: "workspace-1" },
      body: { term: "midterm" },
    });

    assert.equal(result.res.statusCode, null);
    assert.deepEqual(database.writes, [{
      studentId: "student-1",
      scores: { me: 25 },
    }]);
  } finally {
    database.restore();
  }
});

test("exam assessment periods map to PE or ME in the corresponding gradebook term", async () => {
  const cases = [
    { assessmentTerm: "prelim", gradebookTerm: "midterm", column: "pe", max: 40 },
    { assessmentTerm: "midterm", gradebookTerm: "midterm", column: "me", max: 50 },
    { assessmentTerm: "pre_final", gradebookTerm: "finals", column: "pe", max: 40 },
    { assessmentTerm: "finals", gradebookTerm: "finals", column: "me", max: 50 },
  ];

  for (const item of cases) {
    const database = mockAssessmentSyncDatabase({
      assessment: { type: "exam", term: item.assessmentTerm },
      gradeConfig: { pe_max: 40, me_max: 50 },
      students: [{ id: "student-1", name: "Student One" }],
      submissions: [{
        student_id: "student-1",
        student_name: "Student One",
        score: 15,
        total_points: 30,
      }],
    });

    try {
      const result = await invoke(syncAssessmentToGrades, {
        params: { sectionId: "1A", id: "assessment-1" },
        user: { id: "workspace-1" },
        body: { term: item.gradebookTerm },
      });

      assert.equal(result.res.statusCode, null, item.assessmentTerm);
      assert.deepEqual(database.gradeConfigTerms, [item.gradebookTerm]);
      assert.deepEqual(database.gradeWriteTerms, [item.gradebookTerm]);
      assert.deepEqual(database.writes, [{
        studentId: "student-1",
        scores: { [item.column]: item.max * 0.5 },
      }]);
    } finally {
      database.restore();
    }
  }
});

test("recitation sync adds online and in-person points and caps each RT at its maximum", async () => {
  const database = mockAssessmentSyncDatabase({
    assessment: { type: "recitation", term: "prelim" },
    gradeConfig: { rt_max: 50 },
    students: [
      { id: "student-1", name: "Student One" },
      { id: "student-2", name: "Student Two" },
    ],
    onlineRecitationScores: [
      { student_id: "student-1", student_name: "Student One", score: 30 },
      { student_id: "student-2", student_name: "Student Two", score: 20 },
    ],
    inPersonRecitationScores: [
      { student_id: "student-1", student_name: "Student One", score: 10 },
      { student_id: "student-2", student_name: "Student Two", score: 40 },
    ],
  });

  try {
    const result = await invoke(syncAssessmentToGrades, {
      params: { sectionId: "1A", id: "assessment-1" },
      user: { id: "workspace-1" },
      body: { term: "midterm" },
    });

    assert.equal(result.res.statusCode, null);
    assert.deepEqual(database.writes, [
      { studentId: "student-1", scores: { rt: 40 } },
      { studentId: "student-2", scores: { rt: 50 } },
    ]);
    assert.deepEqual(database.queriedRecitationTerms, [
      ["prelim", "midterm"],
      ["prelim", "midterm"],
    ]);
    assert.deepEqual(database.gradeWriteTerms, ["midterm", "midterm"]);
  } finally {
    database.restore();
  }
});

test("recitation sync rejects an empty term instead of writing empty RT values", async () => {
  const database = mockAssessmentSyncDatabase({
    assessment: { type: "recitation", term: "prelim" },
    gradeConfig: { rt_max: 50 },
    students: [{ id: "student-1", name: "Student One" }],
  });

  try {
    const result = await invoke(syncAssessmentToGrades, {
      params: { sectionId: "1A", id: "assessment-1" },
      user: { id: "workspace-1" },
      body: { term: "midterm" },
    });

    assert.equal(result.res.statusCode, 400);
    assert.match(result.res.body.message, /No recorded online or in-person recitation scores/);
    assert.equal(database.writes.length, 0);
  } finally {
    database.restore();
  }
});

test("public assessment taking requires access code and student name", async () => {
  const noCode = await invoke(getPublicAssessment, {
    params: { accessCode: "  " },
  });
  assert.equal(noCode.res.statusCode, 400);

  const noStudentName = await invoke(submitPublicAssessment, {
    params: { accessCode: "ABC12345" },
    body: { student_name: "  " },
  });
  assert.equal(noStudentName.res.statusCode, 400);
});

test("assessment update rejects invalid status, empty title, and missing auth", async () => {
  const noAuth = await invoke(updateAssessment, {
    params: { sectionId: "1A", id: "00000000-0000-0000-0000-000000000001" },
    body: { status: "published" },
  });
  assert.equal(noAuth.res.statusCode, 401);

  const badStatus = await invoke(updateAssessment, {
    params: { sectionId: "1A", id: "00000000-0000-0000-0000-000000000001" },
    user: { id: "00000000-0000-0000-0000-000000000001" },
    body: { status: "invalid_status" },
  });
  assert.equal(badStatus.res.statusCode, 400);

  const emptyTitle = await invoke(updateAssessment, {
    params: { sectionId: "1A", id: "00000000-0000-0000-0000-000000000001" },
    user: { id: "00000000-0000-0000-0000-000000000001" },
    body: { title: "   " },
  });
  assert.equal(emptyTitle.res.statusCode, 400);
});

test("public assessment attempts persist a server start time and opaque resume token", async () => {
  const originalConnect = dbModule.pool.connect;
  let insertedValues;
  const client = {
    async query(sql, params = []) {
      const normalized = String(sql).toLowerCase();
      if (normalized.includes("from assessments where access_code")) {
        return {
          rowCount: 1,
          rows: [{
            id: "assessment-1",
            section_id: "1A",
            status: "published",
            time_limit_minutes: 30,
            workspace_id: "00000000-0000-0000-0000-000000000001",
          }],
        };
      }
      if (normalized.includes("from students")) {
        return { rowCount: 1, rows: [{ id: "S-42", name: "Jane Doe" }] };
      }
      if (normalized.includes("pg_advisory_lock")) return { rows: [] };
      if (normalized.includes("submitted_at is null")) return { rowCount: 0, rows: [] };
      if (normalized.includes("submitted_at is not null")) return { rowCount: 0, rows: [] };
      if (normalized.includes("insert into assessment_submissions")) {
        insertedValues = params;
        return { rowCount: 1, rows: [{ id: "attempt-1" }] };
      }
      if (normalized.includes("select s.id, s.answers")) {
        return {
          rows: [{
            id: "attempt-1",
            answers: {},
            progress: {},
            started_at: "2026-11-15T10:00:00.000Z",
            saved_at: null,
            tab_switch_count: 0,
            integrity_log: [],
            time_limit_minutes: 30,
            server_time: "2026-11-15T10:00:00.000Z",
            expires_at: "2026-11-15T10:30:00.000Z",
          }],
        };
      }
      return { rows: [] };
    },
    release() {},
  };

  try {
    dbModule.pool.connect = async () => client;
    const result = await invoke(startPublicAssessmentAttempt, {
      params: { accessCode: "ABC123" },
      body: { student_id: "S-42", student_name: "Jane Doe" },
    });

    assert.equal(result.res.statusCode, 201);
    assert.equal(result.res.body.attempt_id, "attempt-1");
    assert.equal(result.res.body.attempt_token.length, 64);
    assert.notEqual(insertedValues[3], result.res.body.attempt_token);
    assert.equal(result.res.body.expires_at, "2026-11-15T10:30:00.000Z");
  } finally {
    dbModule.pool.connect = originalConnect;
  }
});

test("public assessment attempts resume only with the matching token", async () => {
  const originalConnect = dbModule.pool.connect;
  const token = "c".repeat(64);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  let attemptRead = false;
  const client = {
    async query(sql) {
      const normalized = String(sql).toLowerCase();
      if (normalized.includes("from assessments where access_code")) {
        return {
          rowCount: 1,
          rows: [{
            id: "assessment-1",
            section_id: "1A",
            status: "published",
            workspace_id: "00000000-0000-0000-0000-000000000001",
          }],
        };
      }
      if (normalized.includes("from students")) {
        return { rowCount: 1, rows: [{ id: "S-42", name: "Jane Doe" }] };
      }
      if (normalized.includes("pg_advisory_lock")) return { rows: [] };
      if (normalized.includes("submitted_at is null")) {
        return { rowCount: 1, rows: [{ id: "attempt-1", attempt_token_hash: tokenHash }] };
      }
      if (normalized.includes("select s.id, s.answers")) {
        attemptRead = true;
        return {
          rowCount: 1,
          rows: [{
            id: "attempt-1",
            answers: { q1: "A" },
            progress: { currentQuestionId: "q1" },
            started_at: "2026-11-15T10:00:00.000Z",
            saved_at: "2026-11-15T10:01:00.000Z",
            tab_switch_count: 0,
            integrity_log: [],
            time_limit_minutes: 30,
            server_time: "2026-11-15T10:01:00.000Z",
            expires_at: "2026-11-15T10:30:00.000Z",
          }],
        };
      }
      return { rows: [] };
    },
    release() {},
  };

  try {
    dbModule.pool.connect = async () => client;
    const result = await invoke(startPublicAssessmentAttempt, {
      params: { accessCode: "ABC123" },
      body: { student_id: "S-42", student_name: "Jane Doe", attempt_token: token },
    });

    assert.equal(result.res.statusCode, null);
    assert.equal(attemptRead, true);
    assert.equal(result.res.body.attempt_id, "attempt-1");
    assert.equal(result.res.body.attempt_token, token);
    assert.deepEqual(result.res.body.answers, { q1: "A" });
    assert.deepEqual(result.res.body.progress, { currentQuestionId: "q1" });
  } finally {
    dbModule.pool.connect = originalConnect;
  }
});

test("public assessment attempts reject an invalid resume token", async () => {
  const originalConnect = dbModule.pool.connect;
  const storedHash = crypto.createHash("sha256").update("d".repeat(64)).digest("hex");
  const client = {
    async query(sql) {
      const normalized = String(sql).toLowerCase();
      if (normalized.includes("from assessments where access_code")) {
        return {
          rowCount: 1,
          rows: [{
            id: "assessment-1",
            section_id: "1A",
            status: "published",
            workspace_id: "00000000-0000-0000-0000-000000000001",
          }],
        };
      }
      if (normalized.includes("from students")) {
        return { rowCount: 1, rows: [{ id: "S-42", name: "Jane Doe" }] };
      }
      if (normalized.includes("pg_advisory_lock")) return { rows: [] };
      if (normalized.includes("submitted_at is null")) {
        return { rowCount: 1, rows: [{ id: "attempt-1", attempt_token_hash: storedHash }] };
      }
      throw new Error("An invalid token must not read or create an attempt.");
    },
    release() {},
  };

  try {
    dbModule.pool.connect = async () => client;
    const result = await invoke(startPublicAssessmentAttempt, {
      params: { accessCode: "ABC123" },
      body: { student_id: "S-42", student_name: "Jane Doe", attempt_token: "e".repeat(64) },
    });

    assert.equal(result.res.statusCode, 403);
    assert.match(result.res.body.message, /token is invalid/i);
  } finally {
    dbModule.pool.connect = originalConnect;
  }
});

test("public submissions require a student enrolled in the assessment section", async () => {
  const originalConnect = dbModule.pool.connect;
  const client = {
    async query(sql) {
      const normalized = String(sql).toLowerCase();
      if (normalized.includes("from assessments where access_code")) {
        return {
          rowCount: 1,
          rows: [{
            id: "assessment-1",
            section_id: "1A",
            status: "published",
            workspace_id: "00000000-0000-0000-0000-000000000001",
          }],
        };
      }
      if (normalized.includes("from students")) {
        return { rowCount: 1, rows: [{ id: "S-42", name: "Jane Doe" }] };
      }
      throw new Error("Invalid student must be rejected before creating an attempt.");
    },
    release() {},
  };

  try {
    dbModule.pool.connect = async () => client;

    const result = await invoke(startPublicAssessmentAttempt, {
      params: { accessCode: "ABC123" },
      body: { student_id: "S-99", student_name: "Jane Doe" },
    });

    assert.equal(result.res.statusCode, 403);
    assert.match(result.res.body.message, /not enrolled/i);
  } finally {
    dbModule.pool.connect = originalConnect;
  }
});

test("public submissions are rejected until the assessment is published", async () => {
  const originalConnect = dbModule.pool.connect;
  const client = {
    async query(sql) {
      if (String(sql).toLowerCase().includes("from assessments where access_code")) {
        return { rowCount: 1, rows: [{ id: "assessment-1", status: "draft" }] };
      }
      throw new Error("Draft assessment should not reach student or submission queries.");
    },
    release() {},
  };

  try {
    dbModule.pool.connect = async () => client;

    const result = await invoke(startPublicAssessmentAttempt, {
      params: { accessCode: "ABC123" },
      body: { student_name: "Jane Doe" },
    });

    assert.equal(result.res.statusCode, 403);
    assert.match(result.res.body.message, /not open for attempts/i);
  } finally {
    dbModule.pool.connect = originalConnect;
  }
});

test("attempt autosaves discard answers for unknown questions", async () => {
  const originalQuery = dbModule.pool.query;
  let updateParams;

  try {
    dbModule.pool.query = async (sql, params = []) => {
      if (String(sql).toLowerCase().includes("from assessments a")) {
        return {
          rowCount: 1,
          rows: [{
            id: "attempt-1",
            assessment_status: "published",
            assessment_questions: [{ id: "q1" }],
            assessment_time_limit_minutes: 10,
            elapsed_seconds: 30,
            answers: {},
            progress: {},
            tab_switch_count: 0,
            integrity_log: [],
          }],
        };
      }
      if (String(sql).toLowerCase().includes("update assessment_submissions")) {
        updateParams = params;
        return { rowCount: 1, rows: [{ saved_at: "2026-11-15T10:00:00.000Z" }] };
      }
      throw new Error("Unexpected query during autosave test.");
    };

    const result = await invoke(savePublicAssessmentAttempt, {
      params: { accessCode: "ABC123", attemptId: "attempt-1" },
      body: {
        attempt_token: "a".repeat(64),
        answers: { q1: "A", q_unknown: "injected" },
        progress: { currentIndex: 0, flagged: {} },
      },
    });

    assert.equal(result.res.statusCode, null);
    assert.deepEqual(JSON.parse(updateParams[0]), { q1: "A" });
    assert.equal(updateParams[4], 600);
  } finally {
    dbModule.pool.query = originalQuery;
  }
});

test("expired attempts cannot accept autosaves", async () => {
  const originalQuery = dbModule.pool.query;

  try {
    dbModule.pool.query = async (sql) => {
      if (String(sql).toLowerCase().includes("from assessments a")) {
        return {
          rowCount: 1,
          rows: [{
            id: "attempt-1",
            assessment_status: "published",
            assessment_questions: [{ id: "q1" }],
            assessment_time_limit_minutes: 1,
            elapsed_seconds: 60,
          }],
        };
      }
      throw new Error("Expired attempts must not persist another autosave.");
    };

    const result = await invoke(savePublicAssessmentAttempt, {
      params: { accessCode: "ABC123", attemptId: "attempt-1" },
      body: { attempt_token: "f".repeat(64), answers: { q1: "A" } },
    });

    assert.equal(result.res.statusCode, 410);
    assert.match(result.res.body.message, /time limit has elapsed/i);
  } finally {
    dbModule.pool.query = originalQuery;
  }
});

test("expired attempts finalize their last server-saved answers", async () => {
  const originalQuery = dbModule.pool.query;
  let updateParams;
  const token = "b".repeat(64);

  try {
    dbModule.pool.query = async (sql, params = []) => {
      const normalized = String(sql).toLowerCase();
      if (normalized.includes("from assessments where access_code")) {
        return {
          rowCount: 1,
          rows: [{
            id: "assessment-1",
            status: "published",
            questions: [{ id: "q1", type: "multiple_choice", points: 1, correct_answer: "A" }],
            time_limit_minutes: 1,
            show_score_immediately: true,
            passing_percentage: 50,
          }],
        };
      }
      if (normalized.includes("from assessments a")) {
        return {
          rowCount: 1,
          rows: [{
            id: "attempt-1",
            student_id: "S-42",
            student_name: "Jane Doe",
            assessment_status: "published",
            assessment_questions: [{ id: "q1", type: "multiple_choice", points: 1, correct_answer: "A" }],
            assessment_time_limit_minutes: 1,
            assessment_passing_percentage: 50,
            assessment_show_score_immediately: true,
            elapsed_seconds: 61,
            answers: { q1: "A" },
            tab_switch_count: 0,
            integrity_log: [],
          }],
        };
      }
      if (normalized.includes("update assessment_submissions")) {
        updateParams = params;
        return { rowCount: 1, rows: [{ id: "attempt-1" }] };
      }
      throw new Error("Unexpected query during expired submission test.");
    };

    const result = await invoke(submitPublicAssessmentAttempt, {
      params: { accessCode: "ABC123", attemptId: "attempt-1" },
      body: {
        attempt_token: token,
        answers: { q1: "B" },
        tab_switch_count: 10,
        integrity_log: [],
      },
    });

    assert.equal(result.res.statusCode, 201);
    assert.equal(updateParams[0], 60);
    assert.equal(updateParams[1], 1);
    assert.deepEqual(JSON.parse(updateParams[5]), { q1: "A" });
    assert.equal(updateParams[10].length, 64);
  } finally {
    dbModule.pool.query = originalQuery;
  }
});

test("coding submissions ignore browser-reported test results and require teacher grading", async () => {
  const originalQuery = dbModule.pool.query;
  let updateParams;
  const codingQuestion = {
    id: "q_code",
    type: "coding",
    language: "javascript",
    points: 5,
  };

  try {
    dbModule.pool.query = async (sql, params = []) => {
      const normalized = String(sql).toLowerCase();
      if (normalized.includes("from assessments where access_code")) {
        return {
          rowCount: 1,
          rows: [{
            id: "assessment-1",
            status: "published",
            questions: [codingQuestion],
            time_limit_minutes: 10,
            show_score_immediately: true,
            passing_percentage: 50,
          }],
        };
      }
      if (normalized.includes("from assessments a")) {
        return {
          rowCount: 1,
          rows: [{
            id: "attempt-1",
            assessment_status: "published",
            assessment_questions: [codingQuestion],
            assessment_time_limit_minutes: 10,
            elapsed_seconds: 30,
            answers: {},
            tab_switch_count: 0,
            integrity_log: [],
          }],
        };
      }
      if (normalized.includes("update assessment_submissions")) {
        updateParams = params;
        return { rowCount: 1, rows: [{ id: "attempt-1" }] };
      }
      throw new Error("Unexpected query during coding grading test.");
    };

    const result = await invoke(submitPublicAssessmentAttempt, {
      params: { accessCode: "ABC123", attemptId: "attempt-1" },
      body: {
        attempt_token: "a".repeat(64),
        answers: {
          q_code: {
            code: "return true;",
            testResults: [{ passed: true }, { passed: true }],
          },
        },
      },
    });

    const savedAnswers = JSON.parse(updateParams[5]);
    const gradingDetails = JSON.parse(updateParams[6]);
    assert.equal(result.res.statusCode, 201);
    assert.deepEqual(savedAnswers.q_code, { code: "return true;" });
    assert.equal(gradingDetails.q_code.pointsEarned, 0);
    assert.equal(gradingDetails.q_code.needsManualGrading, true);
    assert.equal(updateParams[8], "in_progress");
    assert.equal(result.res.body.hasPendingReviews, true);
    assert.equal(result.res.body.score, undefined);
  } finally {
    dbModule.pool.query = originalQuery;
  }
});

test("manual grading rejects scores outside submission points and invalid statuses", async () => {
  const originalQuery = dbModule.pool.query;

  try {
    dbModule.pool.query = async (sql) => {
      const normalized = String(sql).toLowerCase();
      if (normalized.includes("from assessments a")) return { rowCount: 1, rows: [{ id: "assessment-1" }] };
      if (normalized.includes("from assessment_submissions")) {
        return {
          rowCount: 1,
          rows: [{ id: "submission-1", score: 2, total_points: 5, grading_details: {} }],
        };
      }
      throw new Error("Unexpected database query during invalid grading test.");
    };

    const invalidScore = await invoke(gradeSubmission, {
      params: { sectionId: "1A", id: "assessment-1", submissionId: "submission-1" },
      user: { id: "00000000-0000-0000-0000-000000000001" },
      body: { score: 6, status: "graded" },
    });
    assert.equal(invalidScore.res.statusCode, 400);
    assert.match(invalidScore.res.body.message, /between 0 and 5/i);

    const invalidStatus = await invoke(gradeSubmission, {
      params: { sectionId: "1A", id: "assessment-1", submissionId: "submission-1" },
      user: { id: "00000000-0000-0000-0000-000000000001" },
      body: { score: 3, status: "in_progress" },
    });
    assert.equal(invalidStatus.res.statusCode, 400);
    assert.match(invalidStatus.res.body.message, /invalid grading status/i);
  } finally {
    dbModule.pool.query = originalQuery;
  }
});
