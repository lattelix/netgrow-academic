import { describe, expect, it } from "vitest";
import {
  canApplyToProject,
  canCreateProject,
  canCreateTask,
  canDecideApplication,
  canEditProject,
  canManageReferenceData,
  canManageTeam,
  canListUsers,
  canReadUser,
  canUpdateTask,
  canViewAnalytics,
  canWithdrawApplication,
  type ActorContext,
} from "@/lib/domain/authorization";

const participant: ActorContext = { userId: "u-participant", role: "participant" };
const organizerOwner: ActorContext = { userId: "u-organizer-1", role: "organizer" };
const organizerOther: ActorContext = { userId: "u-organizer-2", role: "organizer" };
const admin: ActorContext = { userId: "u-admin", role: "admin" };
const PROJECT_ORGANIZER_ID = "u-organizer-1";

describe("user read permissions", () => {
  it("reserves the directory for admins and individual profiles for self/admin", () => {
    expect(canListUsers(admin)).toBe(true);
    expect(canListUsers(participant)).toBe(false);
    expect(canListUsers(organizerOwner)).toBe(false);
    expect(canReadUser(admin, participant.userId)).toBe(true);
    expect(canReadUser(participant, participant.userId)).toBe(true);
    expect(canReadUser(participant, organizerOwner.userId)).toBe(false);
    expect(canReadUser(organizerOwner, participant.userId)).toBe(false);
  });
});

describe("canCreateProject", () => {
  it("allows organizers and admins, not participants", () => {
    expect(canCreateProject(organizerOwner)).toBe(true);
    expect(canCreateProject(admin)).toBe(true);
    expect(canCreateProject(participant)).toBe(false);
  });
});

describe("canEditProject / canDecideApplication / canManageTeam / canCreateTask", () => {
  it("allow the owning organizer and admin, not another organizer or a participant", () => {
    for (const fn of [canEditProject, canDecideApplication, canManageTeam, canCreateTask]) {
      expect(fn(organizerOwner, PROJECT_ORGANIZER_ID)).toBe(true);
      expect(fn(admin, PROJECT_ORGANIZER_ID)).toBe(true);
      expect(fn(organizerOther, PROJECT_ORGANIZER_ID)).toBe(false);
      expect(fn(participant, PROJECT_ORGANIZER_ID)).toBe(false);
    }
  });
});

describe("canApplyToProject", () => {
  it("allows only participants", () => {
    expect(canApplyToProject(participant)).toBe(true);
    expect(canApplyToProject(organizerOwner)).toBe(false);
    expect(canApplyToProject(admin)).toBe(false);
  });
});

describe("canWithdrawApplication", () => {
  it("allows the applicant themselves or an admin", () => {
    expect(canWithdrawApplication(participant, participant.userId)).toBe(true);
    expect(canWithdrawApplication(admin, participant.userId)).toBe(true);
    expect(canWithdrawApplication(organizerOwner, participant.userId)).toBe(false);
  });
});

describe("canUpdateTask", () => {
  it("allows the project's organizer, admin, or the assignee, but no one else", () => {
    expect(canUpdateTask(organizerOwner, PROJECT_ORGANIZER_ID, "someone-else")).toBe(true);
    expect(canUpdateTask(admin, PROJECT_ORGANIZER_ID, "someone-else")).toBe(true);
    expect(canUpdateTask(participant, PROJECT_ORGANIZER_ID, participant.userId)).toBe(true);
    expect(canUpdateTask(participant, PROJECT_ORGANIZER_ID, "someone-else")).toBe(false);
    expect(canUpdateTask(organizerOther, PROJECT_ORGANIZER_ID, "someone-else")).toBe(false);
  });
});

describe("canViewAnalytics / canManageReferenceData", () => {
  it("restricts analytics to organizer/admin and reference data to admin only", () => {
    expect(canViewAnalytics(organizerOwner)).toBe(true);
    expect(canViewAnalytics(admin)).toBe(true);
    expect(canViewAnalytics(participant)).toBe(false);

    expect(canManageReferenceData(admin)).toBe(true);
    expect(canManageReferenceData(organizerOwner)).toBe(false);
    expect(canManageReferenceData(participant)).toBe(false);
  });
});
