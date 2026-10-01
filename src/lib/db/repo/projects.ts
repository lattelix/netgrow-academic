import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type {
  ProjectAgeGroup,
  ProjectCompetencyRow,
  ProjectRow,
  ProjectStatus,
} from "@/lib/db/types";

export interface ProjectFilter {
  direction?: string;
  ageGroup?: ProjectAgeGroup;
  status?: ProjectStatus;
  shiftId?: string;
  organizerId?: string;
  competencyIds?: string[];
  search?: string;
}

export interface ProjectWithCounts extends ProjectRow {
  organizer_name: string;
  shift_name: string;
  member_count: number;
  pending_applications: number;
}

const SELECT_BASE = `
  SELECT p.*, u.full_name AS organizer_name, s.name AS shift_name,
    (SELECT COUNT(*) FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.project_id = p.id) AS member_count,
    (SELECT COUNT(*) FROM applications a WHERE a.project_id = p.id AND a.status = 'pending') AS pending_applications
  FROM projects p
  JOIN users u ON u.id = p.organizer_id
  JOIN shifts s ON s.id = p.shift_id
`;

export function listProjects(filter: ProjectFilter = {}): Promise<ProjectWithCounts[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.direction) {
    params.push(filter.direction);
    clauses.push(`p.direction = $${params.length}`);
  }
  if (filter.ageGroup) {
    params.push(filter.ageGroup);
    clauses.push(`(p.age_group = $${params.length} OR p.age_group = 'any')`);
  }
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`p.status = $${params.length}`);
  }
  if (filter.shiftId) {
    params.push(filter.shiftId);
    clauses.push(`p.shift_id = $${params.length}`);
  }
  if (filter.organizerId) {
    params.push(filter.organizerId);
    clauses.push(`p.organizer_id = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    clauses.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }
  if (filter.competencyIds && filter.competencyIds.length > 0) {
    const placeholders = filter.competencyIds.map((_, i) => `$${params.length + i + 1}`).join(", ");
    clauses.push(`p.id IN (SELECT project_id FROM project_competencies WHERE competency_id IN (${placeholders}))`);
    params.push(...filter.competencyIds);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query<ProjectWithCounts>(`${SELECT_BASE} ${where} ORDER BY p.created_at DESC`, params);
}

export function getProject(id: string): Promise<ProjectWithCounts | undefined> {
  return queryOne<ProjectWithCounts>(`${SELECT_BASE} WHERE p.id = $1`, [id]);
}

/** Locks the base project row for the duration of the caller's transaction. */
export function lockProjectRow(id: string): Promise<ProjectRow | undefined> {
  return queryOne<ProjectRow>("SELECT * FROM projects WHERE id = $1 FOR UPDATE", [id]);
}

/** Must be called after `lockProjectRow` so the count reflects any
 * concurrent approval that committed while waiting for the lock. */
export async function countApprovedTeamMembers(projectId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.project_id = $1`,
    [projectId]
  );
  return row?.n ?? 0;
}

export async function listDirections(): Promise<string[]> {
  const rows = await query<{ direction: string }>("SELECT DISTINCT direction FROM projects ORDER BY direction");
  return rows.map((r) => r.direction);
}

export interface CreateProjectInput {
  title: string;
  description: string;
  direction: string;
  ageGroup: ProjectAgeGroup;
  shiftId: string;
  organizerId: string;
  capacity: number;
  status?: ProjectStatus;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
  const id = makeId("proj");
  const createdAt = nowIso();
  await query(
    `INSERT INTO projects (id, title, description, direction, age_group, status, shift_id, organizer_id, capacity, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
    [
      id,
      input.title,
      input.description,
      input.direction,
      input.ageGroup,
      input.status ?? "draft",
      input.shiftId,
      input.organizerId,
      input.capacity,
      createdAt,
    ]
  );
  return (await queryOne<ProjectRow>("SELECT * FROM projects WHERE id = $1", [id]))!;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  direction?: string;
  ageGroup?: ProjectAgeGroup;
  status?: ProjectStatus;
  capacity?: number;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectRow | undefined> {
  const current = await queryOne<ProjectRow>("SELECT * FROM projects WHERE id = $1", [id]);
  if (!current) return undefined;
  await query(
    `UPDATE projects SET title = $1, description = $2, direction = $3,
      age_group = $4, status = $5, capacity = $6, updated_at = $7
     WHERE id = $8`,
    [
      input.title ?? current.title,
      input.description ?? current.description,
      input.direction ?? current.direction,
      input.ageGroup ?? current.age_group,
      input.status ?? current.status,
      input.capacity ?? current.capacity,
      nowIso(),
      id,
    ]
  );
  return queryOne<ProjectRow>("SELECT * FROM projects WHERE id = $1", [id]);
}

export interface ProjectCompetencyWithName extends ProjectCompetencyRow {
  name: string;
  category: string;
}

export function listProjectCompetencies(projectId: string): Promise<ProjectCompetencyWithName[]> {
  return query<ProjectCompetencyWithName>(
    `SELECT pc.*, c.name, c.category
     FROM project_competencies pc
     JOIN competencies c ON c.id = pc.competency_id
     WHERE pc.project_id = $1
     ORDER BY c.category, c.name`,
    [projectId]
  );
}

export async function setProjectCompetencies(
  projectId: string,
  competencies: { competencyId: string; minLevel: number }[]
): Promise<void> {
  await query("DELETE FROM project_competencies WHERE project_id = $1", [projectId]);
  for (const c of competencies) {
    await query(
      `INSERT INTO project_competencies (id, project_id, competency_id, min_level)
       VALUES ($1, $2, $3, $4)`,
      [makeId("pcomp"), projectId, c.competencyId, c.minLevel]
    );
  }
}
