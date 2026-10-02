// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for scoped read integration tests");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

import { getPool, closePool } from "@/lib/db/client";
import { initSchema } from "@/lib/db/initSchema";
import { assertLocalTestDatabaseUrl } from "@/lib/db/resetGuard";
import { CONTENT_TABLES_CHILD_FIRST } from "@/lib/db/schemaTables";
import { getAnalyticsSummary } from "@/lib/db/repo/analytics";
import { listRecentActivity } from "@/lib/db/repo/activityLog";
import { listEventsForUser } from "@/lib/db/repo/events";
import type { ActorContext } from "@/lib/domain/authorization";

const organizer: ActorContext = { userId: "scope-org-a", role: "organizer" };
const admin: ActorContext = { userId: "scope-admin", role: "admin" };
const participant: ActorContext = { userId: "scope-p-a", role: "participant" };

beforeAll(async () => {
  assertLocalTestDatabaseUrl(process.env.TEST_DATABASE_URL!, "netgrow_test");
  await initSchema(getPool());
});
afterAll(closePool);

beforeEach(async () => {
  await getPool().query(`TRUNCATE roles, ${CONTENT_TABLES_CHILD_FIRST.join(", ")} RESTART IDENTITY CASCADE`);
  await getPool().query(`
    INSERT INTO roles (id, code, name) VALUES (1,'participant','Participant'),(2,'organizer','Organizer'),(3,'admin','Admin');
    INSERT INTO shifts (id,name,code,start_date,end_date) VALUES ('scope-shift','Shift','SCOPE','2026-10-01','2026-10-21');
    INSERT INTO users (id,full_name,email,role_id) VALUES
      ('scope-org-a','Organizer A','org-a@example.test',2),
      ('scope-org-b','Organizer B','org-b@example.test',2),
      ('scope-empty','Organizer Empty','empty@example.test',2),
      ('scope-admin','Admin','admin@example.test',3),
      ('scope-p-a','Participant A','a@example.test',1),
      ('scope-p-b','Participant B','b@example.test',1),
      ('scope-p-c','Participant C','c@example.test',1),
      ('scope-unused','Unused Participant','unused@example.test',1);
    INSERT INTO projects (id,title,direction,age_group,status,shift_id,organizer_id,capacity) VALUES
      ('scope-project-a','Project A','Science','any','recruiting','scope-shift','scope-org-a',4),
      ('scope-project-b','Project B','Sports','any','in_progress','scope-shift','scope-org-b',2);
    INSERT INTO teams (id,project_id,name) VALUES ('scope-team-a','scope-project-a','Team A'),('scope-team-b','scope-project-b','Team B');
    INSERT INTO team_members (id,team_id,user_id) VALUES
      ('scope-member-a','scope-team-a','scope-p-a'),('scope-member-c','scope-team-a','scope-p-c'),('scope-member-b','scope-team-b','scope-p-b');
    INSERT INTO applications (id,project_id,applicant_id,status,created_at,decided_at,decided_by) VALUES
      ('scope-app-a','scope-project-a','scope-p-a','approved','2026-10-01T08:00:00.000Z','2026-10-01T10:00:00.000Z','scope-org-a'),
      ('scope-app-b','scope-project-b','scope-p-b','rejected','2026-10-01T08:00:00.000Z','2026-10-01T18:00:00.000Z','scope-org-b');
    INSERT INTO tasks (id,team_id,title,status,created_by) VALUES
      ('scope-task-a1','scope-team-a','Task A1','todo','scope-org-a'),
      ('scope-task-a2','scope-team-a','Task A2','done','scope-org-a'),
      ('scope-task-b','scope-team-b','Task B','in_progress','scope-org-b');
    INSERT INTO events (id,shift_id,team_id,title,starts_at,ends_at,created_by) VALUES
      ('scope-event-a','scope-shift','scope-team-a','Event A','2026-10-02T08:00:00.000Z','2026-10-02T09:00:00.000Z','scope-org-a'),
      ('scope-event-b','scope-shift','scope-team-b','Event B','2026-10-02T08:00:00.000Z','2026-10-02T09:00:00.000Z','scope-org-b'),
      ('scope-general','scope-shift',NULL,'General','2026-10-02T08:00:00.000Z','2026-10-02T09:00:00.000Z','scope-org-b');
    INSERT INTO activity_log (id,actor_id,action,entity_type,entity_id) VALUES
      ('scope-log-project-a','scope-org-b','project.updated','project','scope-project-a'),
      ('scope-log-project-b','scope-org-a','project.updated','project','scope-project-b'),
      ('scope-log-app-a','scope-p-a','application.created','application','scope-app-a'),
      ('scope-log-app-b','scope-org-a','application.rejected','application','scope-app-b'),
      ('scope-log-task-a','scope-p-a','task.updated','task','scope-task-a1'),
      ('scope-log-task-b','scope-org-a','task.updated','task','scope-task-b'),
      ('scope-log-team-a','scope-admin','team.updated','team','scope-team-a'),
      ('scope-log-event-a','scope-admin','event.created','event','scope-event-a'),
      ('scope-log-event-b','scope-org-a','event.created','event','scope-event-b'),
      ('scope-log-general','scope-org-a','event.created','event','scope-general'),
      ('scope-log-user','scope-org-a','profile.updated','user','scope-p-a');
  `);
});

describe("role-scoped analytics", () => {
  it("counts only the organizer's projects and distinct related participants", async () => {
    const summary = await getAnalyticsSummary(organizer);
    expect(summary).toMatchObject({
      totalProjects: 1, totalTeams: 1, totalParticipants: 2, totalOrganizers: 1,
      averageTeamFillRate: 0.5, averageDecisionHours: 2,
      projectsByStatus: [{ status: "recruiting", count: 1 }],
      applicationsByStatus: [{ status: "approved", count: 1 }],
      directionBreakdown: [{ direction: "Science", projectCount: 1 }],
    });
    expect(summary.tasksByStatus).toEqual(expect.arrayContaining([{ status: "todo", count: 1 }, { status: "done", count: 1 }]));
    expect(summary.tasksByStatus).toHaveLength(2);
  });

  it("keeps administrator totals global", async () => {
    const summary = await getAnalyticsSummary(admin);
    expect(summary).toMatchObject({ totalProjects: 2, totalTeams: 2, totalParticipants: 4, totalOrganizers: 3, averageDecisionHours: 6, averageTeamFillRate: 0.5 });
    expect(summary.tasksByStatus).toHaveLength(3);
    expect(summary.directionBreakdown).toHaveLength(2);
  });

  it("returns empty aggregates, not global fallbacks, for an organizer without projects", async () => {
    expect(await getAnalyticsSummary({ userId: "scope-empty", role: "organizer" })).toEqual({
      projectsByStatus: [], applicationsByStatus: [], tasksByStatus: [],
      totalParticipants: 0, totalOrganizers: 0, totalProjects: 0, totalTeams: 0,
      averageTeamFillRate: 0, averageDecisionHours: null, directionBreakdown: [],
    });
  });

  it("ignores changes made to another organizer's projects", async () => {
    const before = await getAnalyticsSummary(organizer);
    await getPool().query("UPDATE projects SET capacity = 100, direction = 'Changed', status = 'completed' WHERE id = 'scope-project-b'");
    await getPool().query("UPDATE tasks SET status = 'done' WHERE id = 'scope-task-b'");
    expect(await getAnalyticsSummary(organizer)).toEqual(before);
  });

  it("updates task aggregates after a real scoped mutation", async () => {
    await getPool().query("UPDATE tasks SET status = 'done' WHERE id = 'scope-task-a1'");
    expect((await getAnalyticsSummary(organizer)).tasksByStatus).toEqual([{ status: "done", count: 2 }]);
  });

  it("does not allow participant calls to bypass API permission checks", async () => {
    await expect(getAnalyticsSummary(participant)).rejects.toThrow("access denied");
  });
});

describe("role-scoped activity", () => {
  it("uses entity ownership, including participant/admin actions, not the actor ID", async () => {
    const ids = (await listRecentActivity(organizer)).map(item => item.id).sort();
    expect(ids).toEqual(["scope-log-project-a", "scope-log-app-a", "scope-log-task-a", "scope-log-team-a", "scope-log-event-a"].sort());
    expect((await listRecentActivity(admin)).length).toBe(11);
  });

  it("returns no global activity for an organizer without projects", async () => {
    expect(await listRecentActivity({ userId: "scope-empty", role: "organizer" })).toEqual([]);
  });

  it("bounds the number of returned records", async () => {
    expect(await listRecentActivity(admin, -1)).toHaveLength(1);
    expect(await listRecentActivity(admin, 2.9)).toHaveLength(2);
    expect(await listRecentActivity(admin, NaN)).toHaveLength(11);
  });

  it("rejects participant reads in the repository too", () => {
    expect(() => listRecentActivity(participant)).toThrow("access denied");
  });
});

describe("role-scoped calendar repository", () => {
  it("includes general events plus member/owned teams, or everything for admin", async () => {
    const ids = async (actor: ActorContext) => (await listEventsForUser(actor)).map(e => e.id).sort();
    expect(await ids(participant)).toEqual(["scope-event-a", "scope-general"]);
    expect(await ids(organizer)).toEqual(["scope-event-a", "scope-general"]);
    expect(await ids({ userId: "scope-org-b", role: "organizer" })).toEqual(["scope-event-b", "scope-general"]);
    expect(await ids(admin)).toEqual(["scope-event-a", "scope-event-b", "scope-general"]);
  });
});
