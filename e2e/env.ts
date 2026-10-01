// e2e always runs against its own `netgrow_e2e` database, never against the
// dev or test databases, regardless of what DATABASE_URL otherwise points at.
export function deriveE2eDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      "DATABASE_URL не задан. Укажите его в .env.local (см. .env.example) перед запуском pnpm e2e."
    );
  }
  const url = new URL(base);
  url.pathname = "/netgrow_e2e";
  assertLocalTestDatabaseUrl(url.toString(), "netgrow_e2e");
  return url.toString();
}
import { assertLocalTestDatabaseUrl } from "../src/lib/db/resetGuard";
