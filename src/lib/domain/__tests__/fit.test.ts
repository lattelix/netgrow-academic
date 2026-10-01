import { describe, expect, it } from "vitest";
import { computeFitScore } from "@/lib/domain/fit";

describe("computeFitScore", () => {
  it("treats a project with no requirements as a full match", () => {
    const result = computeFitScore([], [{ competencyId: "c1", level: 1 }]);
    expect(result).toEqual({ score: 1, matched: 0, required: 0, missing: [] });
  });

  it("scores a full match as 1", () => {
    const result = computeFitScore(
      [{ competencyId: "c1", minLevel: 2 }, { competencyId: "c2", minLevel: 3 }],
      [{ competencyId: "c1", level: 2 }, { competencyId: "c2", level: 4 }]
    );
    expect(result.score).toBe(1);
    expect(result.matched).toBe(2);
    expect(result.missing).toEqual([]);
  });

  it("scores a partial match and lists missing competencies", () => {
    const result = computeFitScore(
      [{ competencyId: "c1", minLevel: 2 }, { competencyId: "c2", minLevel: 3 }],
      [{ competencyId: "c1", level: 2 }]
    );
    expect(result.score).toBe(0.5);
    expect(result.matched).toBe(1);
    expect(result.missing).toEqual(["c2"]);
  });

  it("treats a competency below the minimum level as missing", () => {
    const result = computeFitScore(
      [{ competencyId: "c1", minLevel: 4 }],
      [{ competencyId: "c1", level: 2 }]
    );
    expect(result.score).toBe(0);
    expect(result.missing).toEqual(["c1"]);
  });

  it("treats an unpossessed competency as level 0", () => {
    const result = computeFitScore([{ competencyId: "c1", minLevel: 1 }], []);
    expect(result.score).toBe(0);
    expect(result.missing).toEqual(["c1"]);
  });
});
