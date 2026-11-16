import test from "node:test";
import assert from "node:assert/strict";
import { validateGradeConfiguration } from "./gradeConfigValidation.js";
import {
  isValidGradeTerm,
  validateGradeScores,
} from "../../shared/gradeValidation.js";

const validConfig = {
  weights: { me: 0, quiz: 0.4, rec: 0.3, dep: 0.2, att: 0.1 },
  transmutation: {
    me_low: 50,
    me_high: 100,
    quiz_low: 50,
    quiz_high: 100,
    rec_low: 70,
    rec_high: 95,
    att_low: 70,
    att_high: 95,
  },
};

test("accepts zero weights when the total remains 100%", () => {
  assert.equal(validateGradeConfiguration(validConfig), null);
});

test("rejects weights that do not total 100%", () => {
  assert.equal(
    validateGradeConfiguration({
      ...validConfig,
      weights: { ...validConfig.weights, att: 0 },
    }),
    "Category weights must total exactly 100%.",
  );
});

test("rejects reversed transmutation bounds", () => {
  assert.equal(
    validateGradeConfiguration({
      ...validConfig,
      transmutation: { ...validConfig.transmutation, me_low: 100, me_high: 50 },
    }),
    "Each transmutation high value must be greater than its low value.",
  );
});

test("rejects invalid maxima and duplicate quiz item IDs", () => {
  assert.match(
    validateGradeConfiguration({
      ...validConfig,
      pe_max: -1,
    }),
    /Maximum point values/,
  );
  assert.match(
    validateGradeConfiguration({
      ...validConfig,
      quiz_items: [
        { id: "Q1", name: "Quiz 1", max: 10 },
        { id: "Q1", name: "Quiz 2", max: 10 },
      ],
    }),
    /unique ID/,
  );
});

test("validates partial score updates without rejecting blank Excel cells", () => {
  assert.equal(validateGradeScores({ pe: "12.5", at: "", quizzes: { HQ1: null } }), null);
  assert.match(validateGradeScores({ pe: -1 }), /non-negative finite numbers/);
  assert.match(validateGradeScores({ quizzes: [] }), /Quiz scores must be an object/);
  assert.match(validateGradeScores({ unrelated: 5 }), /Unsupported score field/);
});

test("allows supported and legacy grade terms only", () => {
  assert.equal(isValidGradeTerm("midterm"), true);
  assert.equal(isValidGradeTerm("finals"), true);
  assert.equal(isValidGradeTerm("semestral"), true);
  assert.equal(isValidGradeTerm("future"), false);
  assert.equal(isValidGradeTerm(["midterm"]), false);
});
