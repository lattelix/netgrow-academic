import { getDb } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { CompetencyRow, UserCompetencyRow } from "@/lib/db/types";

export function listCompetencies(): CompetencyRow[] {
  return getDb()
    .prepare("SELECT * FROM competencies ORDER BY category, name")
    .all() as CompetencyRow[];
}

export function getCompetency(id: string): CompetencyRow | undefined {
  return getDb().prepare("SELECT * FROM competencies WHERE id = ?").get(id) as
    | CompetencyRow
    | undefined;
}

export interface CreateCompetencyInput {
  name: string;
  category: string;
  description?: string;
}

export function createCompetency(input: CreateCompetencyInput): CompetencyRow {
  const id = makeId("comp");
  getDb()
    .prepare(
      `INSERT INTO competencies (id, name, category, description, created_at)
       VALUES (@id, @name, @category, @description, @createdAt)`
    )
    .run({
      id,
      name: input.name,
      category: input.category,
      description: input.description ?? "",
      createdAt: nowIso(),
    });
  return getCompetency(id)!;
}

export function updateCompetency(
  id: string,
  input: Partial<CreateCompetencyInput>
): CompetencyRow | undefined {
  const current = getCompetency(id);
  if (!current) return undefined;
  getDb()
    .prepare(
      `UPDATE competencies SET name = @name, category = @category, description = @description WHERE id = @id`
    )
    .run({
      id,
      name: input.name ?? current.name,
      category: input.category ?? current.category,
      description: input.description ?? current.description,
    });
  return getCompetency(id);
}

export function deleteCompetency(id: string): void {
  getDb().prepare("DELETE FROM competencies WHERE id = ?").run(id);
}

export interface UserCompetencyWithDetails extends UserCompetencyRow {
  name: string;
  category: string;
}

export function listUserCompetencies(userId: string): UserCompetencyWithDetails[] {
  return getDb()
    .prepare(
      `SELECT uc.*, c.name, c.category
       FROM user_competencies uc
       JOIN competencies c ON c.id = uc.competency_id
       WHERE uc.user_id = ?
       ORDER BY c.category, c.name`
    )
    .all(userId) as UserCompetencyWithDetails[];
}

export function upsertUserCompetency(
  userId: string,
  competencyId: string,
  level: number
): UserCompetencyRow {
  const db = getDb();
  const existing = db
    .prepare(
      "SELECT * FROM user_competencies WHERE user_id = ? AND competency_id = ?"
    )
    .get(userId, competencyId) as UserCompetencyRow | undefined;
  if (existing) {
    db.prepare("UPDATE user_competencies SET level = ? WHERE id = ?").run(
      level,
      existing.id
    );
    return { ...existing, level };
  }
  const id = makeId("ucomp");
  db.prepare(
    `INSERT INTO user_competencies (id, user_id, competency_id, level, created_at)
     VALUES (@id, @userId, @competencyId, @level, @createdAt)`
  ).run({ id, userId, competencyId, level, createdAt: nowIso() });
  return { id, user_id: userId, competency_id: competencyId, level, created_at: nowIso() };
}

export function deleteUserCompetency(userId: string, competencyId: string): void {
  getDb()
    .prepare("DELETE FROM user_competencies WHERE user_id = ? AND competency_id = ?")
    .run(userId, competencyId);
}
