import { getDb } from "@/lib/db/client";

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

export function getAnalyticsSummary(): AnalyticsSummary {
  const db = getDb();

  const projectsByStatus = db
    .prepare("SELECT status, COUNT(*) AS count FROM projects GROUP BY status")
    .all() as StatusCount[];

  const applicationsByStatus = db
    .prepare("SELECT status, COUNT(*) AS count FROM applications GROUP BY status")
    .all() as StatusCount[];

  const tasksByStatus = db
    .prepare("SELECT status, COUNT(*) AS count FROM tasks GROUP BY status")
    .all() as StatusCount[];

  const totalParticipants = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'participant'"
      )
      .get() as { c: number }
  ).c;

  const totalOrganizers = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'organizer'"
      )
      .get() as { c: number }
  ).c;

  const totalProjects = (db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number })
    .c;

  const totalTeams = (db.prepare("SELECT COUNT(*) AS c FROM teams").get() as { c: number }).c;

  const fillRows = db
    .prepare(
      `SELECT p.capacity AS capacity,
        (SELECT COUNT(*) FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.project_id = p.id) AS members
       FROM projects p
       WHERE p.status IN ('recruiting', 'in_progress', 'completed')`
    )
    .all() as { capacity: number; members: number }[];
  const averageTeamFillRate =
    fillRows.length === 0
      ? 0
      : fillRows.reduce((sum, r) => sum + Math.min(1, r.members / r.capacity), 0) / fillRows.length;

  const decisionRow = db
    .prepare(
      `SELECT AVG((julianday(decided_at) - julianday(created_at)) * 24) AS avgHours
       FROM applications
       WHERE decided_at IS NOT NULL`
    )
    .get() as { avgHours: number | null };

  const directionBreakdown = db
    .prepare(
      `SELECT direction, COUNT(*) AS projectCount FROM projects GROUP BY direction ORDER BY projectCount DESC`
    )
    .all() as { direction: string; projectCount: number }[];

  return {
    projectsByStatus,
    applicationsByStatus,
    tasksByStatus,
    totalParticipants,
    totalOrganizers,
    totalProjects,
    totalTeams,
    averageTeamFillRate,
    averageDecisionHours: decisionRow.avgHours,
    directionBreakdown,
  };
}
