import test from "node:test";
import assert from "node:assert/strict";
import { setAttendance, toggleAttendance } from "./attendanceController.js";

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

test("attendance writes reject malformed dates and student IDs before querying", async () => {
  const invalidSet = await invoke(setAttendance, {
    params: { sectionId: "1A" },
    body: { studentId: "student-1", date: "2026-02-31", isAbsent: true },
  });
  const invalidToggle = await invoke(toggleAttendance, {
    params: { sectionId: "1A" },
    body: { studentId: "", date: "2026-11-13" },
  });

  assert.equal(invalidSet.res.statusCode, 400);
  assert.equal(invalidSet.nextCalled, false);
  assert.equal(invalidToggle.res.statusCode, 400);
  assert.equal(invalidToggle.nextCalled, false);
});
