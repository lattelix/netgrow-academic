import { execSync } from "node:child_process";

const env = { ...process.env, NETGROW_DB_PATH: "./data/netgrow.e2e.db" };

export default function globalSetup() {
  execSync("tsx scripts/reset-db.ts", { stdio: "inherit", env });
  execSync("tsx scripts/init-db.ts", { stdio: "inherit", env });
  execSync("tsx scripts/seed.ts", { stdio: "inherit", env });
}
