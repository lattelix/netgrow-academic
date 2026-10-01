import { loadLocalEnv } from "../src/lib/db/env";

loadLocalEnv();

import { closePool, getPool } from "../src/lib/db/client";
import { initSchema } from "../src/lib/db/initSchema";

async function main() {
  await initSchema(getPool());
  console.log("Схема базы данных готова.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
