// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required for follow-up regression tests");
  process.env.DATABASE_URL = testUrl;
});

import { closePool, getPool } from "@/lib/db/client";
import { initSchema } from "@/lib/db/initSchema";
import { assertLocalTestDatabaseUrl } from "@/lib/db/resetGuard";
import { CONTENT_TABLES_CHILD_FIRST } from "@/lib/db/schemaTables";
import { getUserById } from "@/lib/db/repo/users";
import { getCurrentUser } from "@/lib/auth/session";
import { PATCH as updateProject } from "@/app/api/projects/[id]/route";
import { PATCH as updateTask } from "@/app/api/tasks/[id]/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  toActorContext: (user: { id: string; role_code: string }) => ({ userId: user.id, role: user.role_code }),
}));

const JSON_HEADERS = { "Content-Type": "application/json" };

function withId(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function actAs(id: string) {
  vi.mocked(getCurrentUser).mockResolvedValue((await getUserById(id))!);
}

async function resetFixture() {
  const pool = getPool();
  await pool.query(`TRUNCATE roles, ${CONTENT_TABLES_CHILD_FIRST.join(", ")} RESTART IDENTITY CASCADE`);
  await pool.query(`
    INSERT INTO roles (id, code, name) VALUES
      (1, 'participant', 'Participant'), (2, 'organizer', 'Organizer'), (3, 'admin', 'Admin');
    INSERT INTO shifts (id, name, code, start_date, end_date)
      VALUES ('fu-shift', 'Shift', 'FU', '2026-10-01', '2026-10-21');
    INSERT INTO users (id, full_name, email, role_id, shift_id, age_group) VALUES
      ('fu-organizer', 'Organizer', 'fu-organizer@example.test', 2, 'fu-shift', NULL),
      ('fu-p1', 'Participant 1', 'fu-p1@example.test', 1, 'fu-shift', '12-14'),
      ('fu-p2', 'Participant 2', 'fu-p2@example.test', 1, 'fu-shift', '12-14');
    INSERT INTO projects (id, title, direction, age_group, status, shift_id, organizer_id, capacity)
      VALUES ('fu-project', 'Project', 'Science', 'any', 'recruiting', 'fu-shift', 'fu-organizer', 3);
    INSERT INTO teams (id, project_id, name) VALUES ('fu-team', 'fu-project', 'Team');
    INSERT INTO team_members (id, team_id, user_id) VALUES
      ('fu-member-1', 'fu-team', 'fu-p1'),
      ('fu-member-2', 'fu-team', 'fu-p2');
    INSERT INTO tasks (id, team_id, title, assignee_id, status, created_by)
      VALUES ('fu-task', 'fu-team', 'Original task', 'fu-p1', 'todo', 'fu-organizer');
  `);
}

async function installTaskDelayTrigger() {
  await getPool().query(`
    CREATE OR REPLACE FUNCTION delay_task_title_update() RETURNS trigger AS $$
    BEGIN
      IF NEW.title IS DISTINCT FROM OLD.title THEN
        PERFORM pg_sleep(0.25);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER delay_task_title_update_trigger
      BEFORE UPDATE ON tasks
      FOR EACH ROW EXECUTE FUNCTION delay_task_title_update();
  `);
}

async function dropTaskDelayTrigger() {
  await getPool().query("DROP TRIGGER IF EXISTS delay_task_title_update_trigger ON tasks");
  await getPool().query("DROP FUNCTION IF EXISTS delay_task_title_update()");
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
  await dropTaskDelayTrigger();
});

describe("project capacity invariant", () => {
  it("does not allow capacity below the already formed team size", async () => {
    await actAs("fu-organizer");

    const rejected = await updateProject(
      new Request("http://localhost/api/projects/fu-project", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ capacity: 1 }),
      }),
      withId("fu-project")
    );
    expect(rejected.status).toBe(409);
    expect((await getPool().query("SELECT capacity FROM projects WHERE id = 'fu-project'")).rows[0].capacity).toBe(3);
    expect((await getPool().query("SELECT COUNT(*) AS n FROM activity_log")).rows[0].n).toBe(0);

    const allowed = await updateProject(
      new Request("http://localhost/api/projects/fu-project", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ capacity: 2 }),
      }),
      withId("fu-project")
    );
    expect(allowed.status).toBe(200);
    expect((await getPool().query("SELECT capacity FROM projects WHERE id = 'fu-project'")).rows[0].capacity).toBe(2);
  });
});

describe("concurrent task patches", () => {
  it("serializes different-field updates without losing either change", async () => {
    await actAs("fu-organizer");
    await installTaskDelayTrigger();

    const titleUpdate = updateTask(
      new Request("http://localhost/api/tasks/fu-task", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ title: "Renamed task" }),
      }),
      withId("fu-task")
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    const statusUpdate = updateTask(
      new Request("http://localhost/api/tasks/fu-task", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "in_progress" }),
      }),
      withId("fu-task")
    );

    const responses = await Promise.all([titleUpdate, statusUpdate]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);

    const task = (await getPool().query(
      "SELECT title, status FROM tasks WHERE id = 'fu-task'"
    )).rows[0];
    expect(task).toMatchObject({ title: "Renamed task", status: "in_progress" });
    expect((await getPool().query("SELECT COUNT(*) AS n FROM activity_log WHERE entity_id = 'fu-task'")).rows[0].n).toBe(2);
  });
});
