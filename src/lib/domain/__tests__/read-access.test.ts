// @vitest-environment node
//
// Regression coverage for the read-access audit: the project catalog/card
// must require a session but stay open to every logged-in role, while the
// user list and individual profile endpoints must be restricted to
// canListUsers/canReadUser (admin, or self for the profile). Anonymous
// requests must be rejected before any database lookup is attempted.
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
import * as usersRepo from "@/lib/db/repo/users";
import * as projectsRepo from "@/lib/db/repo/projects";
import { getCurrentUser } from "@/lib/auth/session";
import { GET as getProjects } from "@/app/api/projects/route";
import { GET as getProjectCard } from "@/app/api/projects/[id]/route";
import { GET as getUsers } from "@/app/api/users/route";
import { GET as getUserProfile } from "@/app/api/users/[id]/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  toActorContext: (user: { id: string; role_code: string }) => ({ userId: user.id, role: user.role_code }),
}));

async function resetFixture() {
  const pool = getPool();
  await pool.query(`TRUNCATE roles, ${CONTENT_TABLES_CHILD_FIRST.join(", ")} RESTART IDENTITY CASCADE`);
  await pool.query(`INSERT INTO roles (id, code, name) VALUES
    (1, 'participant', 'Participant'), (2, 'organizer', 'Organizer'), (3, 'admin', 'Admin')`);
  await pool.query(
    `INSERT INTO shifts (id, name, code, start_date, end_date) VALUES ('ra-shift', 'Shift A', 'RA-S1', '2026-06-01', '2026-06-21')`
  );
  await pool.query(
    `INSERT INTO users (id, full_name, email, role_id, shift_id) VALUES
       ('ra-participant', 'Participant A', 'ra-participant@example.test', 1, 'ra-shift'),
       ('ra-participant-2', 'Participant B', 'ra-participant-2@example.test', 1, 'ra-shift'),
       ('ra-organizer', 'Organizer A', 'ra-organizer@example.test', 2, 'ra-shift'),
       ('ra-organizer-2', 'Organizer B', 'ra-organizer-2@example.test', 2, 'ra-shift'),
       ('ra-admin', 'Admin', 'ra-admin@example.test', 3, 'ra-shift')`
  );
  await pool.query(
    `INSERT INTO projects (id, title, direction, age_group, status, shift_id, organizer_id, capacity) VALUES
       ('ra-project', 'Project A', 'Science', 'any', 'recruiting', 'ra-shift', 'ra-organizer', 5)`
  );
}

function withId(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function actAs(id: string) {
  vi.mocked(getCurrentUser).mockResolvedValue((await getUserById(id))!);
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
  vi.restoreAllMocks();
});

describe("GET /api/projects (catalog)", () => {
  it("rejects anonymous requests with 401 before any database lookup", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const lookup = vi.spyOn(projectsRepo, "listProjects");
    const res = await getProjects(new Request("http://localhost/api/projects?search=anything"));
    expect(res.status).toBe(401);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("is readable to every logged-in role, with no restriction on viewing others' projects", async () => {
    for (const id of ["ra-participant", "ra-organizer-2", "ra-admin"]) {
      await actAs(id);
      const res = await getProjects(new Request("http://localhost/api/projects"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string }[];
      expect(body.map((p) => p.id)).toContain("ra-project");
    }
  });
});

describe("GET /api/projects/[id] (card)", () => {
  it("rejects anonymous requests with 401 before any database lookup", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const lookup = vi.spyOn(projectsRepo, "getProject");
    const res = await getProjectCard(new Request("http://localhost/api/projects/does-not-exist"), withId("does-not-exist"));
    expect(res.status).toBe(401);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("is readable to every logged-in role, including another organizer's project", async () => {
    for (const id of ["ra-participant", "ra-organizer-2", "ra-admin"]) {
      await actAs(id);
      const res = await getProjectCard(new Request("http://localhost/api/projects/ra-project"), withId("ra-project"));
      expect(res.status).toBe(200);
    }
  });
});

describe("GET /api/users (list)", () => {
  it("rejects anonymous requests", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await getUsers(new Request("http://localhost/api/users"))).status).toBe(401);
  });

  it("forbids participants and organizers alike", async () => {
    for (const id of ["ra-participant", "ra-organizer"]) {
      await actAs(id);
      expect((await getUsers(new Request("http://localhost/api/users"))).status).toBe(403);
    }
  });

  it("permits admin", async () => {
    await actAs("ra-admin");
    const res = await getUsers(new Request("http://localhost/api/users"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string }[];
    expect(body.length).toBeGreaterThanOrEqual(5);
  });
});

describe("GET /api/users/[id] (profile)", () => {
  it("rejects anonymous requests with 401 before any database lookup", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const lookup = vi.spyOn(usersRepo, "getUserById");
    const res = await getUserProfile(new Request("http://localhost/api/users/does-not-exist"), withId("does-not-exist"));
    expect(res.status).toBe(401);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("forbids a participant from reading another participant's profile", async () => {
    await actAs("ra-participant");
    const res = await getUserProfile(new Request("http://localhost/api/users/ra-participant-2"), withId("ra-participant-2"));
    expect(res.status).toBe(403);
  });

  it("forbids an organizer from reading another user's profile", async () => {
    await actAs("ra-organizer");
    const res = await getUserProfile(new Request("http://localhost/api/users/ra-participant"), withId("ra-participant"));
    expect(res.status).toBe(403);
  });

  it("denies before fetching the target: a non-existent id still yields 403, not 404", async () => {
    await actAs("ra-participant");
    const lookup = vi.spyOn(usersRepo, "getUserById");
    const res = await getUserProfile(new Request("http://localhost/api/users/does-not-exist"), withId("does-not-exist"));
    expect(res.status).toBe(403);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("permits reading one's own profile regardless of role", async () => {
    for (const id of ["ra-participant", "ra-organizer"]) {
      await actAs(id);
      const res = await getUserProfile(new Request(`http://localhost/api/users/${id}`), withId(id));
      expect(res.status).toBe(200);
    }
  });

  it("permits admin to read any profile", async () => {
    await actAs("ra-admin");
    const res = await getUserProfile(new Request("http://localhost/api/users/ra-participant"), withId("ra-participant"));
    expect(res.status).toBe(200);
  });
});
