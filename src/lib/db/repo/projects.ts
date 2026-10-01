import { getDb } from "@/lib/db/client";
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

export function listProjects(filter: ProjectFilter = {}): ProjectWithCounts[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.direction) {
    clauses.push("p.direction = @direction");
    params.direction = filter.direction;
  }
  if (filter.ageGroup) {
    clauses.push("(p.age_group = @ageGroup OR p.age_group = 'any')");
    params.ageGroup = filter.ageGroup;
  }
  if (filter.status) {
    clauses.push("p.status = @status");
    params.status = filter.status;
  }
  if (filter.shiftId) {
    clauses.push("p.shift_id = @shiftId");
    params.shiftId = filter.shiftId;
  }
  if (filter.organizerId) {
    clauses.push("p.organizer_id = @organizerId");
    params.organizerId = filter.organizerId;
  }
  if (filter.search) {
    clauses.push("(p.title LIKE @search OR p.description LIKE @search)");
    params.search = `%${filter.search}%`;
  }
  if (filter.competencyIds && filter.competencyIds.length > 0) {
    const placeholders = filter.competencyIds
      .map((_, i) => `@comp${i}`)
      .join(", ");
    clauses.push(
      `p.id IN (SELECT project_id FROM project_competencies WHERE competency_id IN (${placeholders}))`
    );
    filter.competencyIds.forEach((c, i) => {
      params[`comp${i}`] = c;
    });
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`${SELECT_BASE} ${where} ORDER BY p.created_at DESC`)
    .all(params) as ProjectWithCounts[];
}

export function getProject(id: string): ProjectWithCounts | undefined {
  return getDb()
    .prepare(`${SELECT_BASE} WHERE p.id = @id`)
    .get({ id }) as ProjectWithCounts | undefined;
}

export function listDirections(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT direction FROM projects ORDER BY direction")
    .all() as { direction: string }[];
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

export function createProject(input: CreateProjectInput): ProjectRow {
  const id = makeId("proj");
  const createdAt = nowIso();
  getDb()
    .prepare(
      `INSERT INTO projects (id, title, description, direction, age_group, status, shift_id, organizer_id, capacity, created_at, updated_at)
       VALUES (@id, @title, @description, @direction, @ageGroup, @status, @shiftId, @organizerId, @capacity, @createdAt, @createdAt)`
    )
    .run({
      id,
      title: input.title,
      description: input.description,
      direction: input.direction,
      ageGroup: input.ageGroup,
      status: input.status ?? "draft",
      shiftId: input.shiftId,
      organizerId: input.organizerId,
      capacity: input.capacity,
      createdAt,
    });
  return getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  direction?: string;
  ageGroup?: ProjectAgeGroup;
  status?: ProjectStatus;
  capacity?: number;
}

export function updateProject(
  id: string,
  input: UpdateProjectInput
): ProjectRow | undefined {
  const current = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | ProjectRow
    | undefined;
  if (!current) return undefined;
  getDb()
    .prepare(
      `UPDATE projects SET title = @title, description = @description, direction = @direction,
        age_group = @ageGroup, status = @status, capacity = @capacity, updated_at = @updatedAt
       WHERE id = @id`
    )
    .run({
      id,
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      direction: input.direction ?? current.direction,
      ageGroup: input.ageGroup ?? current.age_group,
      status: input.status ?? current.status,
      capacity: input.capacity ?? current.capacity,
      updatedAt: nowIso(),
    });
  return getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow;
}

export interface ProjectCompetencyWithName extends ProjectCompetencyRow {
  name: string;
  category: string;
}

export function listProjectCompetencies(projectId: string): ProjectCompetencyWithName[] {
  return getDb()
    .prepare(
      `SELECT pc.*, c.name, c.category
       FROM project_competencies pc
       JOIN competencies c ON c.id = pc.competency_id
       WHERE pc.project_id = ?
       ORDER BY c.category, c.name`
    )
    .all(projectId) as ProjectCompetencyWithName[];
}

export function setProjectCompetencies(
  projectId: string,
  competencies: { competencyId: string; minLevel: number }[]
): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM project_competencies WHERE project_id = ?").run(
      projectId
    );
    const insert = db.prepare(
      `INSERT INTO project_competencies (id, project_id, competency_id, min_level)
       VALUES (@id, @projectId, @competencyId, @minLevel)`
    );
    for (const c of competencies) {
      insert.run({
        id: makeId("pcomp"),
        projectId,
        competencyId: c.competencyId,
        minLevel: c.minLevel,
      });
    }
  });
  tx();
}
