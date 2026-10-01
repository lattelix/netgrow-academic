import { query, queryOne } from "@/lib/db/client";
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

export function listApplications(filter: ApplicationFilter = {}): Promise<ApplicationWithDetails[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.projectId) {
    params.push(filter.projectId);
    clauses.push(`a.project_id = $${params.length}`);
  }
  if (filter.applicantId) {
    params.push(filter.applicantId);
    clauses.push(`a.applicant_id = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`a.status = $${params.length}`);
  }
  if (filter.organizerId) {
    params.push(filter.organizerId);
    clauses.push(`p.organizer_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query<ApplicationWithDetails>(`${SELECT_BASE} ${where} ORDER BY a.created_at DESC`, params);
}

export function getApplication(id: string): Promise<ApplicationWithDetails | undefined> {
  return queryOne<ApplicationWithDetails>(`${SELECT_BASE} WHERE a.id = $1`, [id]);
}

/** Plain, unlocked read - only used to discover an application's project_id
 * before taking locks in a fixed project-then-application order. */
export function getApplicationRaw(id: string): Promise<ApplicationRow | undefined> {
  return queryOne<ApplicationRow>("SELECT * FROM applications WHERE id = $1", [id]);
}

/** Locks the base application row for the duration of the caller's transaction.
 * Callers that also need the project row must lock it first (see
 * `lockProjectRow`) to keep a consistent lock order across the app. */
export function lockApplicationRow(id: string): Promise<ApplicationRow | undefined> {
  return queryOne<ApplicationRow>("SELECT * FROM applications WHERE id = $1 FOR UPDATE", [id]);
}

export function findActiveApplication(
  projectId: string,
  applicantId: string
): Promise<ApplicationRow | undefined> {
  return queryOne<ApplicationRow>(
    `SELECT * FROM applications WHERE project_id = $1 AND applicant_id = $2 AND status IN ('pending', 'approved')`,
    [projectId, applicantId]
  );
}

export interface CreateApplicationInput {
  projectId: string;
  applicantId: string;
  message?: string;
}

export async function createApplication(input: CreateApplicationInput): Promise<ApplicationRow> {
  const id = makeId("app");
  const createdAt = nowIso();
  await query(
    `INSERT INTO applications (id, project_id, applicant_id, status, message, decision_note, created_at)
     VALUES ($1, $2, $3, 'pending', $4, '', $5)`,
    [id, input.projectId, input.applicantId, input.message ?? "", createdAt]
  );
  return (await queryOne<ApplicationRow>("SELECT * FROM applications WHERE id = $1", [id]))!;
}

export async function decideApplication(
  id: string,
  status: Extract<ApplicationStatus, "approved" | "rejected">,
  decidedBy: string,
  decisionNote = ""
): Promise<ApplicationRow | undefined> {
  await query(
    `UPDATE applications SET status = $1, decided_by = $2, decided_at = $3, decision_note = $4 WHERE id = $5`,
    [status, decidedBy, nowIso(), decisionNote, id]
  );
  return queryOne<ApplicationRow>("SELECT * FROM applications WHERE id = $1", [id]);
}

export async function withdrawApplication(id: string): Promise<ApplicationRow | undefined> {
  await query(`UPDATE applications SET status = 'withdrawn' WHERE id = $1`, [id]);
  return queryOne<ApplicationRow>("SELECT * FROM applications WHERE id = $1", [id]);
}
