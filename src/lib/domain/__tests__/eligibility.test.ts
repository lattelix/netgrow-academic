import { describe, expect, it } from "vitest";
import { canDecideApplication, checkApplicationEligibility } from "@/lib/domain/eligibility";

const baseProject = { status: "recruiting" as const, ageGroup: "any" as const, capacity: 5 };
const baseCtx = {
  project: baseProject,
  applicant: { ageGroup: null },
  hasActiveApplication: false,
  approvedMemberCount: 0,
};

describe("checkApplicationEligibility", () => {
  it("is eligible when the project is recruiting, open, and age matches", () => {
    const result = checkApplicationEligibility(baseCtx);
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects when the project is not recruiting", () => {
    const result = checkApplicationEligibility({
      ...baseCtx,
      project: { ...baseProject, status: "draft" },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("project_not_recruiting");
  });

  it("rejects a duplicate active application", () => {
    const result = checkApplicationEligibility({ ...baseCtx, hasActiveApplication: true });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(["duplicate_active_application"]);
  });

  it("rejects when the applicant's age group does not match a specific project age group", () => {
    const result = checkApplicationEligibility({
      ...baseCtx,
      project: { ...baseProject, ageGroup: "9-11" },
      applicant: { ageGroup: "15-17" },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("age_group_mismatch");
  });

  it("allows any age group applicant when the project accepts 'any'", () => {
    const result = checkApplicationEligibility({
      ...baseCtx,
      project: { ...baseProject, ageGroup: "any" },
      applicant: { ageGroup: "9-11" },
    });
    expect(result.eligible).toBe(true);
  });

  it("rejects an unknown age group when the project has an age restriction", () => {
    const result = checkApplicationEligibility({
      ...baseCtx,
      project: { ...baseProject, ageGroup: "9-11" },
      applicant: { ageGroup: null },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("age_group_mismatch");
  });

  it("rejects when the team is already at capacity", () => {
    const result = checkApplicationEligibility({
      ...baseCtx,
      project: { ...baseProject, capacity: 3 },
      approvedMemberCount: 3,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("team_full");
  });

  it("accumulates multiple failure reasons at once", () => {
    const result = checkApplicationEligibility({
      project: { status: "draft", ageGroup: "9-11", capacity: 1 },
      applicant: { ageGroup: "15-17" },
      hasActiveApplication: true,
      approvedMemberCount: 1,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual([
      "project_not_recruiting",
      "duplicate_active_application",
      "age_group_mismatch",
      "team_full",
    ]);
  });
});

describe("canDecideApplication", () => {
  it("allows a decision only while the application is pending", () => {
    expect(canDecideApplication("pending")).toBe(true);
    expect(canDecideApplication("approved")).toBe(false);
    expect(canDecideApplication("rejected")).toBe(false);
    expect(canDecideApplication("withdrawn")).toBe(false);
  });
});
