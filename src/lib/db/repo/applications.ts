import { getDb } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { ApplicationRow, ApplicationStatus } from "@/lib/db/types";

export interface ApplicationWithDetails extends ApplicationRow {
  project_title: string;
  applicant_name: string;
}

const SELECT_BASE = `
  SELECT a.*, p.title AS project_title, u.full_name AS applicant_name
  FROM applications a
  JOIN projects p ON p.id = a.project_id
  JOIN users u ON u.id = a.applicant_id
`;

export interface ApplicationFilter {
  projectId?: string;
  applicantId?: string;
  status?: ApplicationStatus;
  organizerId?: string;
}

export function listApplications(filter: ApplicationFilter = {}): ApplicationWithDetails[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter.projectId) {
    clauses.push("a.project_id = @projectId");
    params.projectId = filter.projectId;
  }
  if (filter.applicantId) {
    clauses.push("a.applicant_id = @applicantId");
    params.applicantId = filter.applicantId;
  }
  if (filter.status) {
    clauses.push("a.status = @status");
    params.status = filter.status;
  }
  if (filter.organizerId) {
    clauses.push("p.organizer_id = @organizerId");
    params.organizerId = filter.organizerId;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`${SELECT_BASE} ${where} ORDER BY a.created_at DESC`)
    .all(params) as ApplicationWithDetails[];
}

export function getApplication(id: string): ApplicationWithDetails | undefined {
  return getDb()
    .prepare(`${SELECT_BASE} WHERE a.id = @id`)
    .get({ id }) as ApplicationWithDetails | undefined;
}

export function findActiveApplication(
  projectId: string,
  applicantId: string
): ApplicationRow | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM applications WHERE project_id = ? AND applicant_id = ? AND status IN ('pending', 'approved')`
    )
    .get(projectId, applicantId) as ApplicationRow | undefined;
}

export interface CreateApplicationInput {
  projectId: string;
  applicantId: string;
  message?: string;
}

export function createApplication(input: CreateApplicationInput): ApplicationRow {
  const id = makeId("app");
  const createdAt = nowIso();
  getDb()
    .prepare(
      `INSERT INTO applications (id, project_id, applicant_id, status, message, decision_note, created_at)
       VALUES (@id, @projectId, @applicantId, 'pending', @message, '', @createdAt)`
    )
    .run({
      id,
      projectId: input.projectId,
      applicantId: input.applicantId,
      message: input.message ?? "",
      createdAt,
    });
  return getDb().prepare("SELECT * FROM applications WHERE id = ?").get(id) as ApplicationRow;
}

export function decideApplication(
  id: string,
  status: Extract<ApplicationStatus, "approved" | "rejected">,
  decidedBy: string,
  decisionNote = ""
): ApplicationRow | undefined {
  getDb()
    .prepare(
      `UPDATE applications SET status = @status, decided_by = @decidedBy, decided_at = @decidedAt, decision_note = @decisionNote WHERE id = @id`
    )
    .run({ id, status, decidedBy, decidedAt: nowIso(), decisionNote });
  return getDb().prepare("SELECT * FROM applications WHERE id = ?").get(id) as
    | ApplicationRow
    | undefined;
}

export function withdrawApplication(id: string): ApplicationRow | undefined {
  getDb()
    .prepare(`UPDATE applications SET status = 'withdrawn' WHERE id = ?`)
    .run(id);
  return getDb().prepare("SELECT * FROM applications WHERE id = ?").get(id) as
    | ApplicationRow
    | undefined;
}
