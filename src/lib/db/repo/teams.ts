import { getDb } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { TeamMemberRow, TeamRow, TeamRole } from "@/lib/db/types";

export function getTeamByProject(projectId: string): TeamRow | undefined {
  return getDb()
    .prepare("SELECT * FROM teams WHERE project_id = ?")
    .get(projectId) as TeamRow | undefined;
}

export function getTeam(id: string): TeamRow | undefined {
  return getDb().prepare("SELECT * FROM teams WHERE id = ?").get(id) as
    | TeamRow
    | undefined;
}

export function createTeam(projectId: string, name: string): TeamRow {
  const id = makeId("team");
  getDb()
    .prepare(
      `INSERT INTO teams (id, project_id, name, created_at) VALUES (@id, @projectId, @name, @createdAt)`
    )
    .run({ id, projectId, name, createdAt: nowIso() });
  return getTeam(id)!;
}

export function getOrCreateTeam(projectId: string, defaultName: string): TeamRow {
  return getTeamByProject(projectId) ?? createTeam(projectId, defaultName);
}

export interface TeamMemberWithUser extends TeamMemberRow {
  full_name: string;
  avatar_color: string;
}

export function listTeamMembers(teamId: string): TeamMemberWithUser[] {
  return getDb()
    .prepare(
      `SELECT tm.*, u.full_name, u.avatar_color
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY tm.role_in_team DESC, u.full_name`
    )
    .all(teamId) as TeamMemberWithUser[];
}

export function isTeamMember(teamId: string, userId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?")
    .get(teamId, userId);
  return row !== undefined;
}

export function addTeamMember(
  teamId: string,
  userId: string,
  roleInTeam: TeamRole = "member"
): TeamMemberRow {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM team_members WHERE team_id = ? AND user_id = ?")
    .get(teamId, userId) as TeamMemberRow | undefined;
  if (existing) return existing;
  const id = makeId("tmem");
  db.prepare(
    `INSERT INTO team_members (id, team_id, user_id, role_in_team, joined_at)
     VALUES (@id, @teamId, @userId, @roleInTeam, @joinedAt)`
  ).run({ id, teamId, userId, roleInTeam, joinedAt: nowIso() });
  return db.prepare("SELECT * FROM team_members WHERE id = ?").get(id) as TeamMemberRow;
}

export function removeTeamMember(teamId: string, userId: string): void {
  getDb()
    .prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?")
    .run(teamId, userId);
}

export function listTeamsForUser(userId: string): TeamRow[] {
  return getDb()
    .prepare(
      `SELECT t.* FROM teams t JOIN team_members tm ON tm.team_id = t.id WHERE tm.user_id = ?`
    )
    .all(userId) as TeamRow[];
}

export function listTeamsForOrganizer(organizerId: string): TeamRow[] {
  return getDb()
    .prepare(
      `SELECT t.* FROM teams t JOIN projects p ON p.id = t.project_id WHERE p.organizer_id = ?`
    )
    .all(organizerId) as TeamRow[];
}

export function listAllTeams(): TeamRow[] {
  return getDb().prepare("SELECT * FROM teams").all() as TeamRow[];
}
