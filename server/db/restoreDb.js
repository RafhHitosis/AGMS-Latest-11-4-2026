import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const databaseName = process.env.PGDATABASE || "attendance_db";

const getBackupPath = (args) => {
  const fileOption = args.indexOf("--file");
  return fileOption >= 0 ? args[fileOption + 1] : null;
};

const runRestore = (backupFile) =>
  new Promise((resolve, reject) => {
    const args = [
      "--exit-on-error",
      "--single-transaction",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
      "--host",
      process.env.PGHOST || "localhost",
      "--port",
      process.env.PGPORT || "5432",
      "--username",
      process.env.PGUSER || "postgres",
      "--dbname",
      databaseName,
      backupFile,
    ];
    const child = spawn("pg_restore", args, { stdio: "inherit", env: process.env });
    child.once("error", (err) => {
      reject(new Error(`Unable to start pg_restore: ${err.message}`));
    });
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_restore exited with status ${code}.`));
      }
    });
  });

export const restoreDatabaseBackup = async (args = process.argv.slice(2)) => {
  const requestedFile = getBackupPath(args);
  if (!requestedFile) {
    throw new Error("Specify a backup with --file <path-to-dump>.");
  }
  const backupFile = path.resolve(requestedFile);
  const fileStats = await fs.stat(backupFile);
  if (!fileStats.isFile()) {
    throw new Error("The specified backup path is not a file.");
  }

  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const confirmation = await readline.question(
      `This overwrites database "${databaseName}". Type the database name to continue: `
    );
    if (confirmation !== databaseName) {
      throw new Error("Database name did not match; restore cancelled.");
    }
  } finally {
    readline.close();
  }

  await runRestore(backupFile);
  console.log(`Database restored from ${backupFile}`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  restoreDatabaseBackup().catch((err) => {
    console.error("Database restore failed:", err.message);
    process.exitCode = 1;
  });
}
