import test from "node:test";
import assert from "node:assert/strict";
import {
  resetGrades,
  saveGradeConfig,
  updateStudentScore,
  batchUpdateScores,
} from "./gradeController.js";

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

test("grade endpoints reject invalid terms, scores, and configurations before writing", async () => {
  const invalidConfig = await invoke(saveGradeConfig, {
    params: { sectionId: "1A" },
    body: { term: "midterm", config: { weights: { me: 1 } } },
  });
  const invalidScore = await invoke(updateStudentScore, {
    params: { sectionId: "1A" },
    body: { term: "future", studentId: "student-1", scores: { pe: -1 } },
  });
  const invalidBatch = await invoke(batchUpdateScores, {
    params: { sectionId: "1A" },
    body: { grades: { "student-1": { pe: -1 } } },
  });
  const invalidReset = await invoke(resetGrades, {
    params: { sectionId: "1A" },
    query: { term: "future" },
  });

  for (const result of [invalidConfig, invalidScore, invalidBatch, invalidReset]) {
    assert.equal(result.res.statusCode, 400);
    assert.equal(result.nextCalled, false);
  }
});
