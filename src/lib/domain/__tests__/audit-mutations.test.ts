// @vitest-environment node
//
// Regression coverage for the transactional-audit fix: every business
// mutation in src/app/api must commit together with its activity_log write,
// and roll back together if the log write fails. A real BEFORE INSERT
// trigger on activity_log (not a mocked logActivity) forces a failure deep
// inside each route's withTransaction callback, so this exercises the real
// BEGIN/COMMIT/ROLLBACK path through pg, not just application-level mocks.
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
import { getCurrentUser } from "@/lib/auth/session";
import { POST as createProject } from "@/app/api/projects/route";
import { PATCH as updateProject } from "@/app/api/projects/[id]/route";
import { POST as submitApplication } from "@/app/api/applications/route";
import { POST as createTask } from "@/app/api/teams/[id]/tasks/route";
import { PATCH as updateTask } from "@/app/api/tasks/[id]/route";
import { POST as createEvent } from "@/app/api/events/route";
import { PATCH as updateProfile } from "@/app/api/profile/route";
import { PUT as upsertCompetency } from "@/app/api/profile/competencies/route";
import { DELETE as deleteOwnCompetency } from "@/app/api/profile/competencies/[competencyId]/route";
import { POST as createShift } from "@/app/api/shifts/route";
import { PATCH as updateShift } from "@/app/api/shifts/[id]/route";
import { POST as createCompetency } from "@/app/api/competencies/route";
import { PATCH as updateCompetency, DELETE as deleteCompetency } from "@/app/api/competencies/[id]/route";
import { PATCH as changeUserRole } from "@/app/api/users/[id]/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  toActorContext: (user: { id: string; role_code: string }) => ({ userId: user.id, role: user.role_code }),
}));

const JSON_HEADERS = { "Content-Type": "application/json" };

function withId(id: string) {
  return { params: Promise.resolve({ id }) };
}

function withCompetencyId(competencyId: string) {
  return { params: Promise.resolve({ competencyId }) };
}

async function actAs(id: string) {
  vi.mocked(getCurrentUser).mockResolvedValue((await getUserById(id))!);
}

async function count(table: string): Promise<number> {
  const result = await getPool().query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return result.rows[0].n;
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

async function resetFixture() {
  const pool = getPool();
  await pool.query(`TRUNCATE roles, ${CONTENT_TABLES_CHILD_FIRST.join(", ")} RESTART IDENTITY CASCADE`);
  await pool.query(`INSERT INTO roles (id, code, name) VALUES
    (1, 'participant', 'Participant'), (2, 'organizer', 'Organizer'), (3, 'admin', 'Admin')`);
  await pool.query(
    `INSERT INTO shifts (id, name, code, start_date, end_date) VALUES
       ('am-shift', 'Shift A', 'AM-S1', '2026-06-01', '2026-06-21'),
       ('am-other-shift', 'Shift B', 'AM-S2', '2026-07-01', '2026-07-21')`
  );
  await pool.query(
    `INSERT INTO users (id, full_name, email, role_id, shift_id, age_group) VALUES
       ('am-admin', 'Admin', 'am-admin@example.test', 3, 'am-shift', NULL),
       ('am-organizer', 'Organizer A', 'am-organizer@example.test', 2, 'am-shift', NULL),
       ('am-organizer-2', 'Organizer B', 'am-organizer-2@example.test', 2, 'am-shift', NULL),
       ('am-participant', 'Participant A', 'am-participant@example.test', 1, 'am-shift', '12-14')`
  );
  await pool.query(`INSERT INTO competencies (id, name, category) VALUES ('am-comp', 'Skill A', 'General')`);
  await pool.query(
    `INSERT INTO projects (id, title, direction, age_group, status, shift_id, organizer_id, capacity) VALUES
       ('am-project', 'Project A', 'Science', 'any', 'recruiting', 'am-shift', 'am-organizer', 5)`
  );
  await pool.query(
    `INSERT INTO project_competencies (id, project_id, competency_id, min_level) VALUES ('am-pcomp', 'am-project', 'am-comp', 1)`
  );
  await pool.query(`INSERT INTO teams (id, project_id, name) VALUES ('am-team', 'am-project', 'Team A')`);
  await pool.query(`INSERT INTO team_members (id, team_id, user_id) VALUES ('am-tmem', 'am-team', 'am-participant')`);
  await pool.query(
    `INSERT INTO tasks (id, team_id, title, status, created_by) VALUES ('am-task', 'am-team', 'Existing task', 'todo', 'am-organizer')`
  );
  await pool.query(
    `INSERT INTO user_competencies (id, user_id, competency_id, level) VALUES ('am-ucomp', 'am-participant', 'am-comp', 2)`
  );
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
});

afterEach(async () => {
  vi.mocked(getCurrentUser).mockReset();
  await dropAuditFailureTrigger();
});

describe("successful mutation commits business rows and audit log together", () => {
  it("project creation persists the project, its competencies, and one log row", async () => {
    await actAs("am-organizer");
    const res = await createProject(
      new Request("http://localhost/api/projects", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          title: "New project",
          direction: "Science",
          ageGroup: "any",
          shiftId: "am-shift",
          capacity: 3,
          competencies: [{ competencyId: "am-comp", minLevel: 2 }],
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(await count("projects")).toBe(2);
    expect(await count("project_competencies")).toBe(2);
    const log = await getPool().query("SELECT id FROM activity_log WHERE entity_id = $1", [body.id]);
    expect(log.rows).toHaveLength(1);
  });
});

describe("application submission", () => {
  it("rolls back the new application if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-participant");
    await expect(
      submitApplication(
        new Request("http://localhost/api/applications", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ projectId: "am-project" }),
        })
      )
    ).rejects.toThrow("audit failure");
    expect(await count("applications")).toBe(0);
    expect(await count("activity_log")).toBe(0);
  });

  it("leaves exactly one row when two submissions race past the eligibility check", async () => {
    await actAs("am-participant");
    const body = JSON.stringify({ projectId: "am-project" });
    const [first, second] = await Promise.all([
      submitApplication(new Request("http://localhost/api/applications", { method: "POST", headers: JSON_HEADERS, body })),
      submitApplication(new Request("http://localhost/api/applications", { method: "POST", headers: JSON_HEADERS, body })),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await count("applications")).toBe(1);
    expect(await count("activity_log")).toBe(1);
  });
});

describe("project mutations", () => {
  it("rolls back project creation (and its competencies) if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-organizer");
    await expect(
      createProject(
        new Request("http://localhost/api/projects", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            title: "Doomed project",
            direction: "Science",
            ageGroup: "any",
            shiftId: "am-shift",
            capacity: 2,
            competencies: [{ competencyId: "am-comp", minLevel: 1 }],
          }),
        })
      )
    ).rejects.toThrow("audit failure");
    expect(await count("projects")).toBe(1);
    expect(await count("project_competencies")).toBe(1);
    expect(await count("activity_log")).toBe(0);
  });

  it("rejects a non-owning organizer without writing, then rolls back the owner's update if logging fails", async () => {
    await actAs("am-organizer-2");
    const forbidden = await updateProject(
      new Request("http://localhost/api/projects/am-project", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ title: "Hijacked" }),
      }),
      withId("am-project")
    );
    expect(forbidden.status).toBe(403);
    expect((await getPool().query("SELECT title FROM projects WHERE id = 'am-project'")).rows[0].title).toBe("Project A");
    expect(await count("activity_log")).toBe(0);

    await installAuditFailureTrigger();
    await actAs("am-organizer");
    await expect(
      updateProject(
        new Request("http://localhost/api/projects/am-project", {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ title: "Updated title", competencies: [] }),
        }),
        withId("am-project")
      )
    ).rejects.toThrow("audit failure");
    expect((await getPool().query("SELECT title FROM projects WHERE id = 'am-project'")).rows[0].title).toBe("Project A");
    expect(await count("project_competencies")).toBe(1);
    expect(await count("activity_log")).toBe(0);
  });
});

describe("task mutations", () => {
  it("rolls back task creation if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-organizer");
    await expect(
      createTask(
        new Request("http://localhost/api/teams/am-team/tasks", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ title: "New task" }),
        }),
        withId("am-team")
      )
    ).rejects.toThrow("audit failure");
    expect(await count("tasks")).toBe(1);
    expect(await count("activity_log")).toBe(0);
  });

  it("rolls back a task status update if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-organizer");
    await expect(
      updateTask(
        new Request("http://localhost/api/tasks/am-task", {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ status: "done" }),
        }),
        withId("am-task")
      )
    ).rejects.toThrow("audit failure");
    expect((await getPool().query("SELECT status FROM tasks WHERE id = 'am-task'")).rows[0].status).toBe("todo");
    expect(await count("activity_log")).toBe(0);
  });
});

describe("event creation", () => {
  it("rejects a team event whose shiftId does not match the team's project shift, without writing", async () => {
    await actAs("am-organizer");
    const res = await createEvent(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          shiftId: "am-other-shift",
          teamId: "am-team",
          title: "Mismatched",
          startsAt: "2026-06-10T10:00:00.000Z",
          endsAt: "2026-06-10T11:00:00.000Z",
        }),
      })
    );
    expect(res.status).toBe(400);
    expect(await count("events")).toBe(0);
  });

  it("rolls back event creation if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-organizer");
    await expect(
      createEvent(
        new Request("http://localhost/api/events", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            shiftId: "am-shift",
            teamId: "am-team",
            title: "Rehearsal",
            startsAt: "2026-06-10T10:00:00.000Z",
            endsAt: "2026-06-10T11:00:00.000Z",
          }),
        })
      )
    ).rejects.toThrow("audit failure");
    expect(await count("events")).toBe(0);
    expect(await count("activity_log")).toBe(0);
  });
});

describe("profile and competency mutations", () => {
  it("rolls back a profile update if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-participant");
    await expect(
      updateProfile(
        new Request("http://localhost/api/profile", {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ bio: "New bio" }),
        })
      )
    ).rejects.toThrow("audit failure");
    expect((await getPool().query("SELECT bio FROM users WHERE id = 'am-participant'")).rows[0].bio).toBe("");
    expect(await count("activity_log")).toBe(0);
  });

  it("rolls back a competency upsert if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-participant");
    await expect(
      upsertCompetency(
        new Request("http://localhost/api/profile/competencies", {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify({ competencyId: "am-comp", level: 5 }),
        })
      )
    ).rejects.toThrow("audit failure");
    const row = await getPool().query(
      "SELECT level FROM user_competencies WHERE user_id = 'am-participant' AND competency_id = 'am-comp'"
    );
    expect(row.rows[0].level).toBe(2);
    expect(await count("activity_log")).toBe(0);
  });

  it("rolls back removing a competency if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-participant");
    await expect(
      deleteOwnCompetency(new Request("http://localhost/api/profile/competencies/am-comp"), withCompetencyId("am-comp"))
    ).rejects.toThrow("audit failure");
    expect(await count("user_competencies")).toBe(1);
    expect(await count("activity_log")).toBe(0);
  });
});

describe("shift mutations", () => {
  it("rolls back shift creation if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-admin");
    await expect(
      createShift(
        new Request("http://localhost/api/shifts", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: "New shift", code: "NEW", startDate: "2026-08-01", endDate: "2026-08-21" }),
        })
      )
    ).rejects.toThrow("audit failure");
    expect(await count("shifts")).toBe(2);
    expect(await count("activity_log")).toBe(0);
  });

  it("rolls back a shift update if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-admin");
    await expect(
      updateShift(
        new Request("http://localhost/api/shifts/am-shift", {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: "Renamed" }),
        }),
        withId("am-shift")
      )
    ).rejects.toThrow("audit failure");
    expect((await getPool().query("SELECT name FROM shifts WHERE id = 'am-shift'")).rows[0].name).toBe("Shift A");
    expect(await count("activity_log")).toBe(0);
  });
});

describe("competency reference-data mutations", () => {
  it("rolls back competency creation if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-admin");
    await expect(
      createCompetency(
        new Request("http://localhost/api/competencies", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: "New skill", category: "Soft" }),
        })
      )
    ).rejects.toThrow("audit failure");
    expect(await count("competencies")).toBe(1);
    expect(await count("activity_log")).toBe(0);
  });

  it("rolls back a competency update if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-admin");
    await expect(
      updateCompetency(
        new Request("http://localhost/api/competencies/am-comp", {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: "Renamed skill" }),
        }),
        withId("am-comp")
      )
    ).rejects.toThrow("audit failure");
    expect((await getPool().query("SELECT name FROM competencies WHERE id = 'am-comp'")).rows[0].name).toBe("Skill A");
    expect(await count("activity_log")).toBe(0);
  });

  it("rolls back a competency deletion (and its cascades) if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-admin");
    await expect(
      deleteCompetency(new Request("http://localhost/api/competencies/am-comp"), withId("am-comp"))
    ).rejects.toThrow("audit failure");
    expect(await count("competencies")).toBe(1);
    expect(await count("project_competencies")).toBe(1);
    expect(await count("user_competencies")).toBe(1);
    expect(await count("activity_log")).toBe(0);
  });
});

describe("role changes", () => {
  it("rolls back a role change if the audit insert fails", async () => {
    await installAuditFailureTrigger();
    await actAs("am-admin");
    await expect(
      changeUserRole(
        new Request("http://localhost/api/users/am-participant", {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ roleCode: "organizer" }),
        }),
        withId("am-participant")
      )
    ).rejects.toThrow("audit failure");
    expect((await getPool().query("SELECT role_id FROM users WHERE id = 'am-participant'")).rows[0].role_id).toBe(1);
    expect(await count("activity_log")).toBe(0);
  });
});
