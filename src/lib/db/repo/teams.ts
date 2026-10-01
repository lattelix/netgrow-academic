import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { TeamMemberRow, TeamRow, TeamRole } from "@/lib/db/types";

export function getTeamByProject(projectId: string): Promise<TeamRow | undefined> {
  return queryOne<TeamRow>("SELECT * FROM teams WHERE project_id = $1", [projectId]);
}

export function getTeam(id: string): Promise<TeamRow | undefined> {
  return queryOne<TeamRow>("SELECT * FROM teams WHERE id = $1", [id]);
}

export async function createTeam(projectId: string, name: string): Promise<TeamRow> {
  const id = makeId("team");
  await query(
    `INSERT INTO teams (id, project_id, name, created_at) VALUES ($1, $2, $3, $4)`,
    [id, projectId, name, nowIso()]
  );
  return (await getTeam(id))!;
}

export async function getOrCreateTeam(projectId: string, defaultName: string): Promise<TeamRow> {
  const existing = await getTeamByProject(projectId);
  return existing ?? createTeam(projectId, defaultName);
}

export interface TeamMemberWithUser extends TeamMemberRow {
  full_name: string;
  avatar_color: string;
}

export function listTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
  return query<TeamMemberWithUser>(
    `SELECT tm.*, u.full_name, u.avatar_color
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1
     ORDER BY tm.role_in_team DESC, u.full_name`,
    [teamId]
  );
}

export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const row = await queryOne("SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2", [teamId, userId]);
  return row !== undefined;
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  roleInTeam: TeamRole = "member"
): Promise<TeamMemberRow> {
  const id = makeId("tmem");
  const row = await queryOne<TeamMemberRow>(
    `INSERT INTO team_members (id, team_id, user_id, role_in_team, joined_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (team_id, user_id) DO UPDATE SET team_id = team_members.team_id
     RETURNING *`,
    [id, teamId, userId, roleInTeam, nowIso()]
  );
  return row!;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  await query("DELETE FROM team_members WHERE team_id = $1 AND user_id = $2", [teamId, userId]);
}

export function listTeamsForUser(userId: string): Promise<TeamRow[]> {
  return query<TeamRow>(
    `SELECT t.* FROM teams t JOIN team_members tm ON tm.team_id = t.id WHERE tm.user_id = $1`,
    [userId]
  );
}

export function listTeamsForOrganizer(organizerId: string): Promise<TeamRow[]> {
  return query<TeamRow>(
    `SELECT t.* FROM teams t JOIN projects p ON p.id = t.project_id WHERE p.organizer_id = $1`,
    [organizerId]
  );
}

export function listAllTeams(): Promise<TeamRow[]> {
  return query<TeamRow>("SELECT * FROM teams");
}
