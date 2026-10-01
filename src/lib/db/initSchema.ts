import { readFileSync } from "node:fs";
import path from "node:path";
import type { Pool, PoolClient } from "pg";

const SCHEMA_PATH = path.join(process.cwd(), "src", "lib", "db", "schema.sql");

/**
 * Explicit, idempotent schema bootstrap (`CREATE TABLE IF NOT EXISTS ...`).
 * Only ever called from the `db:init` script and from test setup, never from
 * request handling or `next build`, so normal query execution has no
 * filesystem dependency on schema.sql.
 */
export async function initSchema(executor: Pool | PoolClient): Promise<void> {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  await executor.query(schema);
}
