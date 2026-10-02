import { query, queryOne } from "@/lib/db/client";
import { canViewAnalytics, type ActorContext } from "@/lib/domain/authorization";

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

export async function getAnalyticsSummary(actor: ActorContext): Promise<AnalyticsSummary> {
  if (!canViewAnalytics(actor)) throw new Error("Analytics access denied");
  const scoped = actor.role === "organizer";
  const params = scoped ? [actor.userId] : [];
  // Every aggregate derives from the same project scope, including indirect
  // relationships through teams. No organizer query falls back to global totals.
  const scope = `WITH scoped_projects AS (
    SELECT * FROM projects ${scoped ? "WHERE organizer_id = $1" : ""}
  ), scoped_teams AS (
    SELECT t.* FROM teams t JOIN scoped_projects p ON p.id = t.project_id
  ), scoped_applications AS (
    SELECT a.* FROM applications a JOIN scoped_projects p ON p.id = a.project_id
  ), scoped_tasks AS (
    SELECT task.* FROM tasks task JOIN scoped_teams t ON t.id = task.team_id
  )`;
  const projectsByStatus = await query<StatusCount>(
    `${scope} SELECT status, COUNT(*) AS count FROM scoped_projects GROUP BY status`, params
  );

  const applicationsByStatus = await query<StatusCount>(
    `${scope} SELECT status, COUNT(*) AS count FROM scoped_applications GROUP BY status`, params
  );

  const tasksByStatus = await query<StatusCount>(
    `${scope} SELECT status, COUNT(*) AS count FROM scoped_tasks GROUP BY status`, params
  );

  const totalParticipants = (
    await queryOne<{ c: number }>(
      `${scope} SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id
       WHERE r.code = 'participant' ${scoped ? `AND (
         EXISTS (SELECT 1 FROM scoped_applications a WHERE a.applicant_id = u.id)
         OR EXISTS (SELECT 1 FROM team_members tm JOIN scoped_teams t ON t.id = tm.team_id WHERE tm.user_id = u.id)
       )` : ""}`, params
    )
  )!.c;

  const totalOrganizers = (
    await queryOne<{ c: number }>(
      scoped
        ? `${scope} SELECT COUNT(DISTINCT organizer_id) AS c FROM scoped_projects`
        : "SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'organizer'",
      params
    )
  )!.c;

  const totalProjects = (await queryOne<{ c: number }>(`${scope} SELECT COUNT(*) AS c FROM scoped_projects`, params))!.c;

  const totalTeams = (await queryOne<{ c: number }>(`${scope} SELECT COUNT(*) AS c FROM scoped_teams`, params))!.c;

  const fillRows = await query<{ capacity: number; members: number }>(
    `${scope} SELECT p.capacity AS capacity,
      (SELECT COUNT(*) FROM team_members tm JOIN scoped_teams t ON t.id = tm.team_id WHERE t.project_id = p.id) AS members
     FROM scoped_projects p
     WHERE p.status IN ('recruiting', 'in_progress', 'completed')`, params
  );
  const averageTeamFillRate =
    fillRows.length === 0
      ? 0
      : fillRows.reduce((sum, r) => sum + Math.min(1, r.members / r.capacity), 0) / fillRows.length;

  const decisionRow = await queryOne<{ avgHours: number | null }>(
    `${scope} SELECT AVG(EXTRACT(EPOCH FROM (decided_at::timestamptz - created_at::timestamptz)) / 3600) AS "avgHours"
     FROM scoped_applications
     WHERE decided_at IS NOT NULL`, params
  );

  const directionBreakdown = await query<{ direction: string; projectCount: number }>(
    `${scope} SELECT direction, COUNT(*) AS "projectCount" FROM scoped_projects GROUP BY direction ORDER BY "projectCount" DESC`, params
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
