export type RoleCode = "participant" | "organizer" | "admin";

export type AgeGroup = "9-11" | "12-14" | "15-17";
export type ProjectAgeGroup = AgeGroup | "any";

export type ShiftStatus = "planned" | "active" | "completed";
export type ProjectStatus = "draft" | "recruiting" | "in_progress" | "completed" | "archived";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type TeamRole = "lead" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type EventType = "training" | "rehearsal" | "meeting" | "performance" | "other";

export interface RoleRow {
  id: number;
  code: RoleCode;
  name: string;
}

export interface ShiftRow {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  status: ShiftStatus;
  created_at: string;
}

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role_id: number;
  shift_id: string | null;
  age_group: AgeGroup | null;
  bio: string;
  avatar_color: string;
  created_at: string;
}

export interface CompetencyRow {
  id: string;
  name: string;
  category: string;
  description: string;
  created_at: string;
}

export interface UserCompetencyRow {
  id: string;
  user_id: string;
  competency_id: string;
  level: number;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  title: string;
  description: string;
  direction: string;
  age_group: ProjectAgeGroup;
  status: ProjectStatus;
  shift_id: string;
  organizer_id: string;
  capacity: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCompetencyRow {
  id: string;
  project_id: string;
  competency_id: string;
  min_level: number;
}

export interface ApplicationRow {
  id: string;
  project_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  message: string;
  decision_note: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface TeamRow {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: TeamRole;
  joined_at: string;
}

export interface TaskRow {
  id: string;
  team_id: string;
  title: string;
  description: string;
  assignee_id: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  shift_id: string;
  team_id: string | null;
  title: string;
  description: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string;
  location: string;
  created_by: string;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: string;
  created_at: string;
}
