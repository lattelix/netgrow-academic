import { query, queryOne } from "@/lib/db/client";

export interface StatusCount {
  status: string;
  count: number;
}

export interface AnalyticsSummary {
  projectsByStatus: StatusCount[];
  applicationsByStatus: StatusCount[];
  tasksByStatus: StatusCount[];
  totalParticipants: number;
  totalOrganizers: number;
  totalProjects: number;
  totalTeams: number;
  averageTeamFillRate: number;
  averageDecisionHours: number | null;
  directionBreakdown: { direction: string; projectCount: number }[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const projectsByStatus = await query<StatusCount>(
    "SELECT status, COUNT(*) AS count FROM projects GROUP BY status"
  );

  const applicationsByStatus = await query<StatusCount>(
    "SELECT status, COUNT(*) AS count FROM applications GROUP BY status"
  );

  const tasksByStatus = await query<StatusCount>("SELECT status, COUNT(*) AS count FROM tasks GROUP BY status");

  const totalParticipants = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'participant'"
    )
  )!.c;

  const totalOrganizers = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'organizer'"
    )
  )!.c;

  const totalProjects = (await queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM projects"))!.c;

  const totalTeams = (await queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM teams"))!.c;

  const fillRows = await query<{ capacity: number; members: number }>(
    `SELECT p.capacity AS capacity,
      (SELECT COUNT(*) FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.project_id = p.id) AS members
     FROM projects p
     WHERE p.status IN ('recruiting', 'in_progress', 'completed')`
  );
  const averageTeamFillRate =
    fillRows.length === 0
      ? 0
      : fillRows.reduce((sum, r) => sum + Math.min(1, r.members / r.capacity), 0) / fillRows.length;

  const decisionRow = await queryOne<{ avgHours: number | null }>(
    `SELECT AVG(EXTRACT(EPOCH FROM (decided_at::timestamptz - created_at::timestamptz)) / 3600) AS "avgHours"
     FROM applications
     WHERE decided_at IS NOT NULL`
  );

  const directionBreakdown = await query<{ direction: string; projectCount: number }>(
    `SELECT direction, COUNT(*) AS "projectCount" FROM projects GROUP BY direction ORDER BY "projectCount" DESC`
  );

  return {
    projectsByStatus,
    applicationsByStatus,
    tasksByStatus,
    totalParticipants,
    totalOrganizers,
    totalProjects,
    totalTeams,
    averageTeamFillRate,
    averageDecisionHours: decisionRow?.avgHours ?? null,
    directionBreakdown,
  };
}
