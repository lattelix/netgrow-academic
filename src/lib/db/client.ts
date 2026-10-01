import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import "./pgTypeParsers";

declare global {
  var __netgrowPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL не задан. Скопируйте .env.example в .env.local и укажите строку подключения к локальному PostgreSQL."
    );
  }
  const pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on("error", (error) => {
    console.error("PostgreSQL idle connection failed:", error.message);
  });
  if (process.env.VERCEL) attachDatabasePool(pool);
  return pool;
}

/** Process-global bounded pool. Never create a Pool per request. */
export function getPool(): Pool {
  if (!globalThis.__netgrowPool) {
    globalThis.__netgrowPool = createPool();
  }
  return globalThis.__netgrowPool;
}

export async function closePool(): Promise<void> {
  const pool = globalThis.__netgrowPool;
  if (pool) {
    globalThis.__netgrowPool = undefined;
    await pool.end();
  }
}

// Propagates the checked-out transaction client to every repository call made
// inside `withTransaction`, so writes never silently fall back to `pool.query`
// on a different connection.
const transactionContext = new AsyncLocalStorage<PoolClient>();

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<T[]> {
  const client = transactionContext.getStore();
  const executor = client ?? getPool();
  const result = await executor.query<T>(text, params as unknown[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/**
 * Runs `fn` on a single checked-out client inside BEGIN/COMMIT. Every
 * `query`/`queryOne` call made (directly or via repositories) while `fn` is
 * running transparently reuses that same client via AsyncLocalStorage.
 * Rolls back and rethrows on any error, including inside PL/pgSQL triggers.
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const existing = transactionContext.getStore();
  if (existing) {
    // Already inside a transaction on this async context; reuse it rather
    // than opening a nested one.
    return fn();
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await transactionContext.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
