import test from "node:test";
import assert from "node:assert/strict";
import { resetDatabase } from "./systemController.js";

test("rejects database resets unless explicitly enabled", async () => {
  const previousValue = process.env.ALLOW_DATABASE_RESET;
  delete process.env.ALLOW_DATABASE_RESET;
  let statusCode;
  let responseBody;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
    },
  };

  try {
    await resetDatabase({ body: {} }, res, (err) => {
      throw err;
    });
  } finally {
    if (previousValue === undefined) delete process.env.ALLOW_DATABASE_RESET;
    else process.env.ALLOW_DATABASE_RESET = previousValue;
  }

  assert.equal(statusCode, 403);
  assert.deepEqual(responseBody, { error: "Database reset is disabled." });
});
