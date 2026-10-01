import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const DB_PATH = process.env.NETGROW_DB_PATH ?? path.join(process.cwd(), "data", "netgrow.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const file = `${DB_PATH}${suffix}`;
  if (existsSync(file)) rmSync(file);
}
console.log("База данных удалена. Будет создана заново при следующем запуске.");
