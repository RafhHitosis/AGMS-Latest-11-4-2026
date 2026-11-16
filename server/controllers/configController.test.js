import test from "node:test";
import assert from "node:assert/strict";
import { updateSectionSchedule, updateSectionSettings } from "./configController.js";

test("section schedule updates reject invalid weekday lists", async () => {
  const invalidSchedules = [undefined, "weekdays", [-1], [7], [1, 1], ["1"]];

  for (const schedule of invalidSchedules) {
    let statusCode = null;
    let responseBody = null;
    let nextCalled = false;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
      },
    };

    await updateSectionSchedule(
      { params: { sectionId: "1A" }, body: { schedule } },
      res,
      () => {
        nextCalled = true;
      },
    );

    assert.equal(statusCode, 400);
    assert.match(responseBody.error, /weekday values from 0 to 6/);
    assert.equal(nextCalled, false);
  }
});

test("section settings reject invalid term dates for all workspace roles", async () => {
  let statusCode = null;
  let responseBody = null;
  let nextCalled = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
    },
  };

  await updateSectionSettings(
    {
      params: { sectionId: "1A" },
      user: { role: "teacher" },
      body: { termDates: { midtermStart: "2026-02-01", midtermEnd: "2026-01-01" } },
    },
    res,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(statusCode, 400);
  assert.match(responseBody.error, /start date/);
  assert.equal(nextCalled, false);
});

test("section settings reject invalid schedule values", async () => {
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
    },
  };

  await updateSectionSettings(
    {
      params: { sectionId: "1A" },
      user: { role: "admin" },
      body: { schedule: [1, 7] },
    },
    res,
    () => assert.fail("Invalid settings must not reach the error handler."),
  );

  assert.equal(statusCode, 400);
  assert.match(responseBody.error, /weekday values from 0 to 6/);
});
