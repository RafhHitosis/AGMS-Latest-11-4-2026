import test from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "./errorHandler.js";

test("does not expose internal 500 errors to production clients", () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousConsoleError = console.error;
  process.env.NODE_ENV = "production";
  console.error = () => {};

  let statusCode;
  let responseBody;
  const res = {
    headersSent: false,
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
    },
  };

  try {
    errorHandler(
      new Error("database credentials or SQL details"),
      { method: "GET", originalUrl: "/api/test" },
      res,
      () => {}
    );
  } finally {
    console.error = previousConsoleError;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }

  assert.equal(statusCode, 500);
  assert.deepEqual(responseBody, { error: "Internal Server Error" });
});
