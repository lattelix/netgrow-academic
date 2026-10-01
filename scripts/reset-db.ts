import { loadLocalEnv } from "../src/lib/db/env";

loadLocalEnv();

import { closePool, getPool } from "../src/lib/db/client";
import { assertDestructiveResetAllowed } from "../src/lib/db/resetGuard";
import { CONTENT_TABLES_CHILD_FIRST } from "../src/lib/db/schemaTables";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL не задан. Укажите его в .env.local перед запуском pnpm db:reset.");
  }
  assertDestructiveResetAllowed(connectionString);

  const pool = getPool();
  for (const table of CONTENT_TABLES_CHILD_FIRST) {
    await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
  // Reference data: dropped too so `db:init` recreates it from a clean slate.
  await pool.query("DROP TABLE IF EXISTS roles CASCADE");

  console.log("Таблицы базы данных удалены. Выполните pnpm db:init и pnpm db:seed, чтобы пересоздать их.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
