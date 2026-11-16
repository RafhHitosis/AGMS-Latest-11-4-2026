import test from "node:test";
import assert from "node:assert/strict";
import { copyTextToClipboard } from "./copyTextToClipboard.js";

const createDocumentStub = (copyResult) => {
  const field = {
    parentNode: null,
    style: {},
    setAttribute() {},
    focus() {},
    select() {},
  };
  const body = {
    appendChild(node) {
      node.parentNode = body;
    },
    removeChild(node) {
      node.parentNode = null;
    },
  };

  return {
    body,
    createElement: () => field,
    execCommand: () => copyResult,
    field,
  };
};

test("uses the clipboard API when it is available", async () => {
  const writes = [];
  const documentRef = createDocumentStub(false);
  const copied = await copyTextToClipboard(
    "BluePanda",
    { writeText: async (value) => writes.push(value) },
    documentRef,
  );

  assert.equal(copied, true);
  assert.deepEqual(writes, ["BluePanda"]);
  assert.equal(documentRef.field.parentNode, null);
});

test("falls back to selecting and copying text when the clipboard API fails", async () => {
  const documentRef = createDocumentStub(true);
  const copied = await copyTextToClipboard(
    "BluePanda",
    { writeText: async () => { throw new Error("Permission denied"); } },
    documentRef,
  );

  assert.equal(copied, true);
  assert.equal(documentRef.field.value, "BluePanda");
  assert.equal(documentRef.field.parentNode, null);
});

test("reports when neither clipboard method is available", async () => {
  const copied = await copyTextToClipboard("BluePanda", null, null);
  assert.equal(copied, false);
});
