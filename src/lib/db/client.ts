import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.NETGROW_DB_PATH ?? path.join(DB_DIR, "netgrow.db");
const SCHEMA_PATH = path.join(process.cwd(), "src", "lib", "db", "schema.sql");

declare global {
  var __netgrowDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__netgrowDb) {
    globalThis.__netgrowDb = createConnection();
  }
  return globalThis.__netgrowDb;
}

export function closeDb(): void {
  if (globalThis.__netgrowDb) {
    globalThis.__netgrowDb.close();
    globalThis.__netgrowDb = undefined;
  }
}

export { DB_PATH };
