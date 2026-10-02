// @vitest-environment node
//
// Regression coverage for the calendar access-control defect: GET /api/events
// used to call the unrestricted `listEventsByShift` whenever `shiftId` was
// supplied, leaking other teams' events. `shiftId` must only ever narrow the
// caller's role-scoped accessible set (general events + permitted teams).
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
import { GET } from "@/app/api/events/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  toActorContext: (user: { id: string; role_code: string }) => ({ userId: user.id, role: user.role_code }),
}));

const EVENT_IDS = {
  generalS1: "cal-evt-general-s1",
  ownS1: "cal-evt-own-s1",
  foreignS1: "cal-evt-foreign-s1",
  generalS2: "cal-evt-general-s2",
  ownS2: "cal-evt-own-s2",
  foreignS2: "cal-evt-foreign-s2",
};

async function resetFixture() {
  const pool = getPool();
  await pool.query(`TRUNCATE roles, ${CONTENT_TABLES_CHILD_FIRST.join(", ")} RESTART IDENTITY CASCADE`);
  await pool.query(`INSERT INTO roles (id, code, name) VALUES
    (1, 'participant', 'Participant'), (2, 'organizer', 'Organizer'), (3, 'admin', 'Admin')`);
  await pool.query(
    `INSERT INTO shifts (id, name, code, start_date, end_date) VALUES
       ('cal-s1', 'Shift 1', 'CAL-S1', '2026-06-01', '2026-06-21'),
       ('cal-s2', 'Shift 2', 'CAL-S2', '2026-07-01', '2026-07-21')`
  );
  await pool.query(
    `INSERT INTO users (id, full_name, email, role_id, shift_id) VALUES
       ('cal-user', 'Calendar User', 'cal-user@example.test', 1, 'cal-s1'),
       ('cal-organizer', 'Calendar Organizer', 'cal-organizer@example.test', 2, 'cal-s1'),
       ('cal-other', 'Other Organizer', 'cal-other@example.test', 2, 'cal-s1'),
       ('cal-admin', 'Calendar Admin', 'cal-admin@example.test', 3, 'cal-s1')`
  );
  await pool.query(
    `INSERT INTO projects (id, title, direction, age_group, status, shift_id, organizer_id, capacity) VALUES
       ('cal-proj-own', 'Own project', 'Science', 'any', 'recruiting', 'cal-s1', 'cal-organizer', 5),
       ('cal-proj-foreign', 'Foreign project', 'Science', 'any', 'recruiting', 'cal-s1', 'cal-other', 5)`
  );
  await pool.query(
    `INSERT INTO teams (id, project_id, name) VALUES
       ('cal-team-own', 'cal-proj-own', 'Own team'),
       ('cal-team-foreign', 'cal-proj-foreign', 'Foreign team')`
  );
  await pool.query(
    `INSERT INTO team_members (id, team_id, user_id) VALUES ('cal-tmem-1', 'cal-team-own', 'cal-user')`
  );
  await pool.query(
    `INSERT INTO events (id, shift_id, team_id, title, starts_at, ends_at, created_by) VALUES
       ($1, 'cal-s1', NULL, 'General S1', '2026-06-05T10:00:00.000Z', '2026-06-05T11:00:00.000Z', 'cal-organizer'),
       ($2, 'cal-s1', 'cal-team-own', 'Own S1', '2026-06-06T10:00:00.000Z', '2026-06-06T11:00:00.000Z', 'cal-organizer'),
       ($3, 'cal-s1', 'cal-team-foreign', 'Foreign S1', '2026-06-07T10:00:00.000Z', '2026-06-07T11:00:00.000Z', 'cal-organizer'),
       ($4, 'cal-s2', NULL, 'General S2', '2026-07-05T10:00:00.000Z', '2026-07-05T11:00:00.000Z', 'cal-organizer'),
       ($5, 'cal-s2', 'cal-team-own', 'Own S2', '2026-07-06T10:00:00.000Z', '2026-07-06T11:00:00.000Z', 'cal-organizer'),
       ($6, 'cal-s2', 'cal-team-foreign', 'Foreign S2', '2026-07-07T10:00:00.000Z', '2026-07-07T11:00:00.000Z', 'cal-organizer')`,
    [EVENT_IDS.generalS1, EVENT_IDS.ownS1, EVENT_IDS.foreignS1, EVENT_IDS.generalS2, EVENT_IDS.ownS2, EVENT_IDS.foreignS2]
  );
}

function request(shiftId?: string) {
  const url = shiftId ? `http://localhost/api/events?shiftId=${shiftId}` : "http://localhost/api/events";
  return GET(new Request(url));
}

async function idsOf(res: Response): Promise<string[]> {
  const body = (await res.json()) as { id: string }[];
  return body.map((e) => e.id).sort();
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

afterEach(() => {
  vi.mocked(getCurrentUser).mockReset();
});

describe("GET /api/events", () => {
  it.each([
    { userId: "cal-organizer", expected: [EVENT_IDS.generalS1, EVENT_IDS.ownS1].sort() },
    { userId: "cal-admin", expected: [EVENT_IDS.generalS1, EVENT_IDS.ownS1, EVENT_IDS.foreignS1].sort() },
  ])("keeps shift filtering inside the role scope for $userId", async ({ userId, expected }) => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById(userId))!);
    const available = new Set(await idsOf(await request()));
    const filtered = await idsOf(await request("cal-s1"));
    expect(filtered).toEqual(expected);
    expect(filtered.every((id) => available.has(id))).toBe(true);
  });

  it("does not inherit team-member access when acting as an organizer", async () => {
    await getPool().query("INSERT INTO team_members (id, team_id, user_id) VALUES ('cal-tmem-organizer', 'cal-team-foreign', 'cal-organizer')");
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("cal-organizer"))!);
    expect(await idsOf(await request("cal-s1"))).toEqual([EVENT_IDS.generalS1, EVENT_IDS.ownS1].sort());
  });

  it("rejects anonymous requests", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await request()).status).toBe(401);
  });

  it("returns general events plus the caller's own team events, excluding foreign teams", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("cal-user"))!);
    const res = await request();
    expect(res.status).toBe(200);
    expect(await idsOf(res)).toEqual(
      [EVENT_IDS.generalS1, EVENT_IDS.ownS1, EVENT_IDS.generalS2, EVENT_IDS.ownS2].sort()
    );
  });

  it("narrows to the caller's own team even for a foreign team's event in the same shift", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("cal-user"))!);
    const res = await request("cal-s1");
    expect(res.status).toBe(200);
    expect(await idsOf(res)).toEqual([EVENT_IDS.generalS1, EVENT_IDS.ownS1].sort());
  });

  it("narrows to the caller's own team in a different shift too", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("cal-user"))!);
    const res = await request("cal-s2");
    expect(res.status).toBe(200);
    expect(await idsOf(res)).toEqual([EVENT_IDS.generalS2, EVENT_IDS.ownS2].sort());
  });

  it("returns an empty list for a shift with no accessible events", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("cal-user"))!);
    const res = await request("shift-does-not-exist");
    expect(res.status).toBe(200);
    expect(await idsOf(res)).toEqual([]);
  });

  it("never returns more events than the unfiltered accessible set (filter-subset invariant)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue((await getUserById("cal-user"))!);
    const all = new Set(await idsOf(await request()));
    for (const shiftId of ["cal-s1", "cal-s2", "shift-does-not-exist"]) {
      const filtered = await idsOf(await request(shiftId));
      for (const id of filtered) {
        expect(all.has(id)).toBe(true);
      }
    }
  });
});
