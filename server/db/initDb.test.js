import assert from "node:assert/strict";
import test from "node:test";
import { applySchemaAndMigrations } from "./initDb.js";

const createDatabasePool = (hasExistingSchema) => {
  const calls = [];
  return {
    calls,
    async query(sql) {
      calls.push(sql);
      if (sql.includes("to_regclass('public.app_config')")) {
        return { rows: [{ has_existing_schema: hasExistingSchema }] };
      }
      return { rows: [] };
    },
  };
};

test("migrates an existing database before applying the tenant-aware baseline schema", async () => {
  const databasePool = createDatabasePool(true);
  let migrationIndex;
  await applySchemaAndMigrations(databasePool, async () => {
    migrationIndex = databasePool.calls.length;
    databasePool.calls.push("MIGRATIONS");
  });

  const schemaIndex = databasePool.calls.findIndex((sql) => sql.includes("CREATE TABLE IF NOT EXISTS app_users"));
  assert.ok(migrationIndex < schemaIndex);
});

test("creates the baseline schema before migrations on a fresh database", async () => {
  const databasePool = createDatabasePool(false);
  let migrationIndex;
  await applySchemaAndMigrations(databasePool, async () => {
    migrationIndex = databasePool.calls.length;
    databasePool.calls.push("MIGRATIONS");
  });

  const schemaIndex = databasePool.calls.findIndex((sql) => sql.includes("CREATE TABLE IF NOT EXISTS app_users"));
  assert.ok(schemaIndex < migrationIndex);
});
