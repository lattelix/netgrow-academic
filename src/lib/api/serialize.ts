import type { UserWithRole } from "@/lib/db/repo/users";
import type { ProjectWithCounts, ProjectCompetencyWithName } from "@/lib/db/repo/projects";
import type { ApplicationWithDetails } from "@/lib/db/repo/applications";
import type { TeamMemberWithUser } from "@/lib/db/repo/teams";
import type { TaskWithAssignee, TaskWithProject } from "@/lib/db/repo/tasks";
import type { EventWithTeam } from "@/lib/db/repo/events";
import type { CompetencyRow } from "@/lib/db/types";
import type { UserCompetencyWithDetails } from "@/lib/db/repo/competencies";
import type { ShiftRow } from "@/lib/db/types";
import type { TeamRow } from "@/lib/db/types";

export function serializeUser(u: UserWithRole) {
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    roleCode: u.role_code,
    roleName: u.role_name,
    shiftId: u.shift_id,
    ageGroup: u.age_group,
    bio: u.bio,
    avatarColor: u.avatar_color,
    createdAt: u.created_at,
  };
}

export function serializeProject(p: ProjectWithCounts) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    direction: p.direction,
    ageGroup: p.age_group,
    status: p.status,
    shiftId: p.shift_id,
    organizerId: p.organizer_id,
    organizerName: p.organizer_name,
    shiftName: p.shift_name,
    capacity: p.capacity,
    memberCount: p.member_count,
    pendingApplications: p.pending_applications,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function serializeProjectCompetency(pc: ProjectCompetencyWithName) {
  return {
    competencyId: pc.competency_id,
    name: pc.name,
    category: pc.category,
    minLevel: pc.min_level,
  };
}

export function serializeApplication(a: ApplicationWithDetails) {
  return {
    id: a.id,
    projectId: a.project_id,
    projectTitle: a.project_title,
    applicantId: a.applicant_id,
    applicantName: a.applicant_name,
    status: a.status,
    message: a.message,
    decisionNote: a.decision_note,
    decidedBy: a.decided_by,
    decidedAt: a.decided_at,
    createdAt: a.created_at,
  };
}

export function serializeTeam(t: TeamRow) {
  return {
    id: t.id,
    projectId: t.project_id,
    name: t.name,
    createdAt: t.created_at,
  };
}

export function serializeTeamMember(m: TeamMemberWithUser) {
  return {
    id: m.id,
    teamId: m.team_id,
    userId: m.user_id,
    fullName: m.full_name,
    avatarColor: m.avatar_color,
    roleInTeam: m.role_in_team,
    joinedAt: m.joined_at,
  };
}

export function serializeTask(t: TaskWithAssignee | TaskWithProject) {
  return {
    id: t.id,
    teamId: t.team_id,
    title: t.title,
    description: t.description,
    assigneeId: t.assignee_id,
    assigneeName: t.assignee_name,
    status: t.status,
    dueDate: t.due_date,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    ...("project_id" in t ? { projectId: t.project_id, projectTitle: t.project_title } : {}),
  };
}

export function serializeEvent(e: EventWithTeam) {
  return {
    id: e.id,
    shiftId: e.shift_id,
    teamId: e.team_id,
    teamName: e.team_name,
    title: e.title,
    description: e.description,
    eventType: e.event_type,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    location: e.location,
    createdBy: e.created_by,
    createdAt: e.created_at,
  };
}

export function serializeCompetency(c: CompetencyRow) {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
  };
}

export function serializeUserCompetency(uc: UserCompetencyWithDetails) {
  return {
    competencyId: uc.competency_id,
    name: uc.name,
    category: uc.category,
    level: uc.level,
  };
}

export function serializeShift(s: ShiftRow) {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    startDate: s.start_date,
    endDate: s.end_date,
    status: s.status,
  };
}
