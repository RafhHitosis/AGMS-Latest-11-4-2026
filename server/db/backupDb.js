import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const databaseName = process.env.PGDATABASE || "attendance_db";

const runCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.once("error", (err) => {
      reject(new Error(`Unable to start ${command}: ${err.message}`));
    });
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with status ${code}.`));
      }
    });
  });

export const createDatabaseBackup = async () => {
  const backupDirectory = path.resolve(process.env.BACKUP_DIR || "backups");
  await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });

  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const safeDatabaseName = databaseName.replace(/[^A-Za-z0-9._-]/g, "_");
  const backupFile = path.join(
    backupDirectory,
    `${safeDatabaseName}-${timestamp}.dump`
  );
  const backupHandle = await fs.open(backupFile, "wx", 0o600);
  await backupHandle.close();
  const args = [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--file",
    backupFile,
    "--host",
    process.env.PGHOST || "localhost",
    "--port",
    process.env.PGPORT || "5432",
    "--username",
    process.env.PGUSER || "postgres",
    databaseName,
  ];

  try {
    await runCommand("pg_dump", args);
  } catch (err) {
    try {
      await fs.rm(backupFile, { force: true });
    } catch (cleanupError) {
      throw new Error(
        `Backup failed: ${err.message}. Partial backup cleanup also failed: ${cleanupError.message}`
      );
    }
    throw err;
  }
  console.log(`Manual database backup created at ${backupFile}`);
  return backupFile;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createDatabaseBackup().catch((err) => {
    console.error("Database backup failed:", err.message);
    process.exitCode = 1;
  });
}
