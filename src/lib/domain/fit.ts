export interface CompetencyRequirement {
  competencyId: string;
  minLevel: number;
}

export interface CompetencyPossession {
  competencyId: string;
  level: number;
}

export interface FitResult {
  score: number;
  matched: number;
  required: number;
  missing: string[];
}

/**
 * Scores how well a candidate's competencies satisfy a project's requirements.
 * Score is the share of required competencies met at or above the required level.
 * A project with no requirements is a full match (score 1) for any candidate.
 */
export function computeFitScore(
  requirements: CompetencyRequirement[],
  possessed: CompetencyPossession[]
): FitResult {
  if (requirements.length === 0) {
    return { score: 1, matched: 0, required: 0, missing: [] };
  }

  const levelByCompetency = new Map(possessed.map((p) => [p.competencyId, p.level]));
  const missing: string[] = [];
  let matched = 0;

  for (const req of requirements) {
    const level = levelByCompetency.get(req.competencyId) ?? 0;
    if (level >= req.minLevel) {
      matched += 1;
    } else {
      missing.push(req.competencyId);
    }
  }

  return {
    score: matched / requirements.length,
    matched,
    required: requirements.length,
    missing,
  };
}
