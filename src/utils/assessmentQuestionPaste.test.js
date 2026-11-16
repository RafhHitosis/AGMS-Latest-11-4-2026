import test from "node:test";
import assert from "node:assert/strict";
import { parsePastedAssessmentQuestions } from "./assessmentQuestionPaste.js";

test("parses newline-separated multiple-choice questions", () => {
  const result = parsePastedAssessmentQuestions(
    "What is 2 + 2? | 3, 4, 5 | B\r\n\nWhich is a vowel? | A. B; B. C; C. A | C",
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.questions.length, 2);
  assert.deepEqual(result.questions[0].options, ["3", "4", "5"]);
  assert.equal(result.questions[0].correct_answer, "4");
  assert.equal(result.questions[1].correct_answer, "A");
});

test("parses semicolon-separated labeled choices", () => {
  const result = parsePastedAssessmentQuestions(
    "1. What does STS stand for? | A. Science, Technology, and Society; B. Society, Technology, and Studies; C. Science, Training, and Systems | A",
  );

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.questions[0].options, [
    "Science, Technology, and Society",
    "Society, Technology, and Studies",
    "Science, Training, and Systems",
  ]);
  assert.equal(result.questions[0].correct_answer, "Science, Technology, and Society");
});

test("reports malformed rows and does not return a partial import", () => {
  const result = parsePastedAssessmentQuestions(
    "Valid? | Yes, No | A\nInvalid? | Yes, No | Maybe",
  );

  assert.deepEqual(result.questions, []);
  assert.deepEqual(result.errors, [
    "Line 2: enter the correct choice letter (A, B, C...).",
  ]);
});

test("requires the correct choice letter instead of answer text", () => {
  const result = parsePastedAssessmentQuestions("Capital of France? | Paris, Rome | Paris");

  assert.deepEqual(result.questions, []);
  assert.deepEqual(result.errors, [
    "Line 1: enter the correct choice letter (A, B, C...).",
  ]);
});

test("rejects rows with missing fields or too few choices", () => {
  const result = parsePastedAssessmentQuestions(
    "Missing answer | Yes, No |\nOnly one | Yes | Yes",
  );

  assert.deepEqual(result.questions, []);
  assert.equal(result.errors.length, 2);
});

test("requires at least one non-empty row", () => {
  const result = parsePastedAssessmentQuestions(" \n ");
  assert.deepEqual(result.questions, []);
  assert.deepEqual(result.errors, ["Paste at least one question."]);
});
