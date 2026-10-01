import type { RoleCode } from "@/lib/db/types";

export interface ActorContext {
  userId: string;
  role: RoleCode;
}

export function canCreateProject(actor: ActorContext): boolean {
  return actor.role === "organizer" || actor.role === "admin";
}

export function canEditProject(actor: ActorContext, organizerId: string): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "organizer" && actor.userId === organizerId;
}

export function canDecideApplication(actor: ActorContext, projectOrganizerId: string): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "organizer" && actor.userId === projectOrganizerId;
}

export function canApplyToProject(actor: ActorContext): boolean {
  return actor.role === "participant";
}

export function canWithdrawApplication(actor: ActorContext, applicantId: string): boolean {
  return actor.role === "admin" || actor.userId === applicantId;
}

export function canManageTeam(actor: ActorContext, projectOrganizerId: string): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "organizer" && actor.userId === projectOrganizerId;
}

export function canCreateTask(actor: ActorContext, projectOrganizerId: string): boolean {
  return canManageTeam(actor, projectOrganizerId);
}

export function canUpdateTask(
  actor: ActorContext,
  projectOrganizerId: string,
  assigneeId: string | null
): boolean {
  if (canManageTeam(actor, projectOrganizerId)) return true;
  return actor.role === "participant" && actor.userId === assigneeId;
}

export function canViewAnalytics(actor: ActorContext): boolean {
  return actor.role === "organizer" || actor.role === "admin";
}

export function canManageReferenceData(actor: ActorContext): boolean {
  return actor.role === "admin";
}
