import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSemestralGrade,
  computeStudentGradeRow,
} from "./gradeCalculations.js";

test("term grade calculations match Excel rounding for weighted components", () => {
  const row = computeStudentGradeRow(
    { id: "student-1", name: "Example Student" },
    {
      me: 45,
      quizzes: { quiz1: 90 },
      rt: 40,
      at: 17,
    },
    {
      me_max: 50,
      pe_max: 0,
      quiz_items: [{ id: "quiz1", max: 100 }],
      rt_max: 50,
      at_max: 18,
      weights: {
        me: 0.4,
        quiz: 0.25,
        rec: 0.25,
        dep: 0.05,
        att: 0.05,
      },
    },
  );

  assert.equal(row.dr, 88.5);
  assert.equal(row.dp, 4.43);
  assert.equal(row.ar, 93.61);
  assert.equal(row.ap, 4.68);
  assert.equal(row.cs, 55.36);
  assert.equal(row.finalGrade, 93.36);
  assert.equal(calculateSemestralGrade(88.5, row.finalGrade), 90.93);
});

test("preserves an explicitly configured zero weight", () => {
  const row = computeStudentGradeRow(
    { id: "student-2", name: "Zero Weight" },
    { me: 50 },
    {
      me_max: 50,
      weights: { me: 0, quiz: 0.25, rec: 0.25, dep: 0.25, att: 0.25 },
    },
  );

  assert.equal(row.mer, 100);
  assert.equal(row.mep, 0);
  assert.equal(row.finalGrade, 0);
});

test("honors saved legacy MER and QR transmutation keys", () => {
  const row = computeStudentGradeRow(
    { id: "student-3", name: "Legacy Transmutation" },
    { me: 50, quizzes: { quiz1: 100 } },
    {
      me_max: 50,
      quiz_items: [{ id: "quiz1", max: 100 }],
      transmutation: {
        mer_high: 90,
        mer_low: 40,
        qr_high: 80,
        qr_low: 30,
      },
    },
  );

  assert.equal(row.mer, 90);
  assert.equal(row.qr, 80);
});
