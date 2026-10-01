import type { ApplicationStatus, ProjectAgeGroup, ProjectStatus } from "@/lib/db/types";

export interface EligibilityProjectInput {
  status: ProjectStatus;
  ageGroup: ProjectAgeGroup;
  capacity: number;
}

export interface EligibilityApplicantInput {
  ageGroup: string | null;
}

export interface EligibilityContext {
  project: EligibilityProjectInput;
  applicant: EligibilityApplicantInput;
  hasActiveApplication: boolean;
  approvedMemberCount: number;
}

export type EligibilityReasonCode =
  | "project_not_recruiting"
  | "duplicate_active_application"
  | "age_group_mismatch"
  | "team_full";

export interface EligibilityResult {
  eligible: boolean;
  reasons: EligibilityReasonCode[];
}

const REASON_MESSAGES_RU: Record<EligibilityReasonCode, string> = {
  project_not_recruiting: "Проект сейчас не набирает участников",
  duplicate_active_application: "У вас уже есть активная заявка на этот проект",
  age_group_mismatch: "Проект рассчитан на другую возрастную группу",
  team_full: "В команде проекта уже нет свободных мест",
};

export function describeEligibilityReason(code: EligibilityReasonCode): string {
  return REASON_MESSAGES_RU[code];
}

export function checkApplicationEligibility(ctx: EligibilityContext): EligibilityResult {
  const reasons: EligibilityReasonCode[] = [];

  if (ctx.project.status !== "recruiting") {
    reasons.push("project_not_recruiting");
  }
  if (ctx.hasActiveApplication) {
    reasons.push("duplicate_active_application");
  }
  if (
    ctx.project.ageGroup !== "any" &&
    ctx.applicant.ageGroup !== ctx.project.ageGroup
  ) {
    reasons.push("age_group_mismatch");
  }
  if (ctx.approvedMemberCount >= ctx.project.capacity) {
    reasons.push("team_full");
  }

  return { eligible: reasons.length === 0, reasons };
}

export function canDecideApplication(currentStatus: ApplicationStatus): boolean {
  return currentStatus === "pending";
}
