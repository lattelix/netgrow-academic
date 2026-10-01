import { execSync } from "node:child_process";
import { loadLocalEnv } from "../src/lib/db/env";
import { deriveE2eDatabaseUrl } from "./env";

export default function globalSetup() {
  loadLocalEnv();
  const env = {
    ...process.env,
    DATABASE_URL: deriveE2eDatabaseUrl(),
    ALLOW_DB_RESET: "1",
  };
  execSync("tsx scripts/reset-db.ts", { stdio: "inherit", env });
  execSync("tsx scripts/init-db.ts", { stdio: "inherit", env });
  execSync("tsx scripts/seed.ts", { stdio: "inherit", env });
}
