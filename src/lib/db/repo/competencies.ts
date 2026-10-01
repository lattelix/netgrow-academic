import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { CompetencyRow, UserCompetencyRow } from "@/lib/db/types";

export function listCompetencies(): Promise<CompetencyRow[]> {
  return query<CompetencyRow>("SELECT * FROM competencies ORDER BY category, name");
}

export function getCompetency(id: string): Promise<CompetencyRow | undefined> {
  return queryOne<CompetencyRow>("SELECT * FROM competencies WHERE id = $1", [id]);
}

export interface CreateCompetencyInput {
  name: string;
  category: string;
  description?: string;
}

export async function createCompetency(input: CreateCompetencyInput): Promise<CompetencyRow> {
  const id = makeId("comp");
  await query(
    `INSERT INTO competencies (id, name, category, description, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, input.name, input.category, input.description ?? "", nowIso()]
  );
  return (await getCompetency(id))!;
}

export async function updateCompetency(
  id: string,
  input: Partial<CreateCompetencyInput>
): Promise<CompetencyRow | undefined> {
  const current = await getCompetency(id);
  if (!current) return undefined;
  await query(
    `UPDATE competencies SET name = $1, category = $2, description = $3 WHERE id = $4`,
    [input.name ?? current.name, input.category ?? current.category, input.description ?? current.description, id]
  );
  return getCompetency(id);
}

export async function deleteCompetency(id: string): Promise<void> {
  await query("DELETE FROM competencies WHERE id = $1", [id]);
}

export interface UserCompetencyWithDetails extends UserCompetencyRow {
  name: string;
  category: string;
}

export function listUserCompetencies(userId: string): Promise<UserCompetencyWithDetails[]> {
  return query<UserCompetencyWithDetails>(
    `SELECT uc.*, c.name, c.category
     FROM user_competencies uc
     JOIN competencies c ON c.id = uc.competency_id
     WHERE uc.user_id = $1
     ORDER BY c.category, c.name`,
    [userId]
  );
}

export async function upsertUserCompetency(
  userId: string,
  competencyId: string,
  level: number
): Promise<UserCompetencyRow> {
  const id = makeId("ucomp");
  const row = await queryOne<UserCompetencyRow>(
    `INSERT INTO user_competencies (id, user_id, competency_id, level, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, competency_id)
     DO UPDATE SET level = EXCLUDED.level
     RETURNING *`,
    [id, userId, competencyId, level, nowIso()]
  );
  return row!;
}

export async function deleteUserCompetency(userId: string, competencyId: string): Promise<void> {
  await query("DELETE FROM user_competencies WHERE user_id = $1 AND competency_id = $2", [userId, competencyId]);
}
