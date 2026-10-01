// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL не задан. Эти тесты требуют локальный PostgreSQL. " +
        "Запустите, например:\n" +
        "  TEST_DATABASE_URL=postgresql://alex@127.0.0.1:55439/netgrow_test pnpm test\n" +
        "База данных netgrow_test должна существовать на локальном сервере (см. README.md)."
    );
  }
  process.env.DATABASE_URL = testUrl;
});

import { getPool, closePool } from "@/lib/db/client";
import { initSchema } from "@/lib/db/initSchema";
import { assertLocalTestDatabaseUrl } from "@/lib/db/resetGuard";
import { CONTENT_TABLES_CHILD_FIRST } from "@/lib/db/schemaTables";
import { getUserById } from "@/lib/db/repo/users";
import { getApplication } from "@/lib/db/repo/applications";
import { getCurrentUser } from "@/lib/auth/session";
import { PATCH, DELETE } from "@/app/api/applications/[id]/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  toActorContext: (user: { id: string; role_code: string }) => ({ userId: user.id, role: user.role_code }),
}));

async function resetFixture() {
  const pool = getPool();
  await pool.query(`TRUNCATE roles, ${CONTENT_TABLES_CHILD_FIRST.join(", ")} RESTART IDENTITY CASCADE`);
  await pool.query(
    `INSERT INTO roles (id, code, name) VALUES (1, 'participant', 'Participant'), (2, 'organizer', 'Organizer')`
  );
  await pool.query(
    `INSERT INTO shifts (id, name, code, start_date, end_date) VALUES ('s', 'Shift', 'S', '2026-06-01', '2026-06-21')`
  );
  await pool.query(
    `INSERT INTO users (id, full_name, email, role_id, shift_id, age_group) VALUES
       ('o', 'Organizer', 'o@example.test', 2, 's', NULL),
       ('u', 'Participant', 'u@example.test', 1, 's', '12-14'),
       ('v', 'Participant 2', 'v@example.test', 1, 's', '12-14')`
  );
  await pool.query(
    `INSERT INTO projects (id, title, direction, age_group, status, shift_id, organizer_id, capacity)
     VALUES ('p', 'Project', 'Science', '12-14', 'recruiting', 's', 'o', 1)`
  );
  await pool.query(`INSERT INTO applications (id, project_id, applicant_id) VALUES ('a', 'p', 'u'), ('b', 'p', 'v')`);
}

async function installAuditFailureTrigger() {
  const pool = getPool();
  await pool.query(`
    CREATE OR REPLACE FUNCTION fail_audit() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'audit failure';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER fail_audit_trigger BEFORE INSERT ON activity_log
    FOR EACH ROW EXECUTE FUNCTION fail_audit();
  `);
}

async function dropAuditFailureTrigger() {
  const pool = getPool();
  await pool.query(`DROP TRIGGER IF EXISTS fail_audit_trigger ON activity_log`);
  await pool.query(`DROP FUNCTION IF EXISTS fail_audit()`);
}

beforeAll(async () => {
  assertLocalTestDatabaseUrl(process.env.TEST_DATABASE_URL!, "netgrow_test");
  await initSchema(getPool());
});

afterAll(async () => {
  await closePool();
});

beforeEach(async () => {
  await resetFixture();
  vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("o"))!);
});

afterEach(async () => {
  await dropAuditFailureTrigger();
});

function decide(id = "a", status = "approved") {
  return PATCH(
    new Request("http://localhost/api/applications/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id }) }
  );
}

async function count(table: string): Promise<number> {
  const result = await getPool().query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return result.rows[0].n;
}

describe("application decision transaction", () => {
  it("commits decision, team, membership and audit record together", async () => {
    expect((await decide()).status).toBe(200);
    expect((await getApplication("a"))?.status).toBe("approved");
    expect(await count("teams")).toBe(1);
    expect(await count("team_members")).toBe(1);
    expect(await count("activity_log")).toBe(1);
  });

  it("rolls back every write if the final audit insert fails", async () => {
    await installAuditFailureTrigger();
    await expect(decide()).rejects.toThrow("audit failure");
    expect((await getApplication("a"))?.status).toBe("pending");
    expect(await count("teams")).toBe(0);
    expect(await count("team_members")).toBe(0);
    expect(await count("activity_log")).toBe(0);
  });

  it("does not exceed capacity when decisions arrive together", async () => {
    const results = await Promise.all([decide("a"), decide("b")]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await count("team_members")).toBe(1);
    expect(await count("activity_log")).toBe(1);
  });

  it("does not apply the same decision twice", async () => {
    expect((await decide()).status).toBe(200);
    expect((await decide()).status).toBe(409);
    expect(await count("activity_log")).toBe(1);
  });

  it("rejects an unauthorized actor without writing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("u"))!);
    expect((await decide()).status).toBe(403);
    expect((await getApplication("a"))?.status).toBe("pending");
    expect(await count("activity_log")).toBe(0);
  });

  it("records rejection without creating a team", async () => {
    expect((await decide("a", "rejected")).status).toBe(200);
    expect((await getApplication("a"))?.status).toBe("rejected");
    expect(await count("teams")).toBe(0);
    expect(await count("activity_log")).toBe(1);
  });

  it("rolls back withdrawal if audit logging fails", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("u"))!);
    await installAuditFailureTrigger();
    await expect(
      DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "a" }) })
    ).rejects.toThrow("audit failure");
    expect((await getApplication("a"))?.status).toBe("pending");
  });
});
