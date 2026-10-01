// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, closeDb } from "@/lib/db/client";
import { getUserById } from "@/lib/db/repo/users";
import { getApplication } from "@/lib/db/repo/applications";
import { getCurrentUser } from "@/lib/auth/session";
import { PATCH, DELETE } from "@/app/api/applications/[id]/route";

vi.hoisted(() => { process.env.NETGROW_DB_PATH = ':memory:'; });
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  toActorContext: (user: { id: string; role_code: string }) => ({ userId: user.id, role: user.role_code }),
}));

beforeEach(() => {
  closeDb();
  getDb().exec(`
    INSERT INTO roles (id,code,name) VALUES (1,'participant','Participant'),(2,'organizer','Organizer');
    INSERT INTO shifts (id,name,code,start_date,end_date) VALUES ('s','Shift','S','2026-06-01','2026-06-21');
    INSERT INTO users (id,full_name,email,role_id,shift_id,age_group) VALUES
      ('o','Organizer','o@example.test',2,'s',NULL),
      ('u','Participant','u@example.test',1,'s','12-14'),
      ('v','Participant 2','v@example.test',1,'s','12-14');
    INSERT INTO projects (id,title,direction,age_group,status,shift_id,organizer_id,capacity)
      VALUES ('p','Project','Science','12-14','recruiting','s','o',1);
    INSERT INTO applications (id,project_id,applicant_id) VALUES ('a','p','u'),('b','p','v');
  `);
  vi.mocked(getCurrentUser).mockResolvedValue(getUserById("o")!);
});
afterEach(() => {
  closeDb();
});

function decide(id = "a", status = "approved") {
  return PATCH(new Request("http://localhost/api/applications/" + id, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }), { params: Promise.resolve({ id }) });
}
function count(table: string) {
  return (getDb().prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
}

describe("application decision transaction", () => {
  it("commits decision, team, membership and audit record together", async () => {
    expect((await decide()).status).toBe(200);
    expect(getApplication("a")?.status).toBe("approved");
    expect(count("teams")).toBe(1);
    expect(count("team_members")).toBe(1);
    expect(count("activity_log")).toBe(1);
  });
  it("rolls back every write if the final audit insert fails", async () => {
    getDb().exec("CREATE TRIGGER fail_audit BEFORE INSERT ON activity_log BEGIN SELECT RAISE(ABORT, 'audit failure'); END");
    await expect(decide()).rejects.toThrow("audit failure");
    expect(getApplication("a")?.status).toBe("pending");
    expect(count("teams")).toBe(0);
    expect(count("team_members")).toBe(0);
    expect(count("activity_log")).toBe(0);
  });
  it("does not exceed capacity when decisions arrive together", async () => {
    const results = await Promise.all([decide("a"), decide("b")]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(count("team_members")).toBe(1);
    expect(count("activity_log")).toBe(1);
  });
  it("does not apply the same decision twice", async () => {
    expect((await decide()).status).toBe(200);
    expect((await decide()).status).toBe(409);
    expect(count("activity_log")).toBe(1);
  });
  it("rejects an unauthorized actor without writing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(getUserById("u")!);
    expect((await decide()).status).toBe(403);
    expect(getApplication("a")?.status).toBe("pending");
    expect(count("activity_log")).toBe(0);
  });
  it("records rejection without creating a team", async () => {
    expect((await decide("a", "rejected")).status).toBe(200);
    expect(getApplication("a")?.status).toBe("rejected");
    expect(count("teams")).toBe(0);
    expect(count("activity_log")).toBe(1);
  });
  it("rolls back withdrawal if audit logging fails", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(getUserById("u")!);
    getDb().exec("CREATE TRIGGER fail_audit BEFORE INSERT ON activity_log BEGIN SELECT RAISE(ABORT, 'audit failure'); END");
    await expect(DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "a" }) })).rejects.toThrow("audit failure");
    expect(getApplication("a")?.status).toBe("pending");
  });
});
