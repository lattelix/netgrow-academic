import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { TaskRow, TaskStatus } from "@/lib/db/types";

export interface TaskWithAssignee extends TaskRow {
  assignee_name: string | null;
}

const ORDER_BY_STATUS_THEN_DUE = `
  ORDER BY CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.due_date IS NULL, t.due_date
`;

export function listTasksByTeam(teamId: string): Promise<TaskWithAssignee[]> {
  return query<TaskWithAssignee>(
    `SELECT t.*, u.full_name AS assignee_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.team_id = $1
     ${ORDER_BY_STATUS_THEN_DUE}`,
    [teamId]
  );
}

export interface TaskWithProject extends TaskWithAssignee {
  project_title: string;
  project_id: string;
}

export function listTasksByAssignee(userId: string): Promise<TaskWithProject[]> {
  return query<TaskWithProject>(
    `SELECT t.*, u.full_name AS assignee_name, p.title AS project_title, p.id AS project_id
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     JOIN teams tm ON tm.id = t.team_id
     JOIN projects p ON p.id = tm.project_id
     WHERE t.assignee_id = $1
     ${ORDER_BY_STATUS_THEN_DUE}`,
    [userId]
  );
}

export function getTask(id: string): Promise<TaskRow | undefined> {
  return queryOne<TaskRow>("SELECT * FROM tasks WHERE id = $1", [id]);
}

export function lockTaskRow(id: string): Promise<TaskRow | undefined> {
  return queryOne<TaskRow>("SELECT * FROM tasks WHERE id = $1 FOR UPDATE", [id]);
}

export interface CreateTaskInput {
  teamId: string;
  title: string;
  description?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  createdBy: string;
  status?: TaskStatus;
}

export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const id = makeId("task");
  const createdAt = nowIso();
  await query(
    `INSERT INTO tasks (id, team_id, title, description, assignee_id, status, due_date, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
    [
      id,
      input.teamId,
      input.title,
      input.description ?? "",
      input.assigneeId ?? null,
      input.status ?? "todo",
      input.dueDate ?? null,
      input.createdBy,
      createdAt,
    ]
  );
  return (await getTask(id))!;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<TaskRow | undefined> {
  // Patch only fields explicitly supplied by the caller. This avoids a
  // read-modify-write lost update when two requests change different fields.
  return queryOne<TaskRow>(
    `UPDATE tasks SET
       title = CASE WHEN $1::boolean THEN $2 ELSE title END,
       description = CASE WHEN $3::boolean THEN $4 ELSE description END,
       assignee_id = CASE WHEN $5::boolean THEN $6 ELSE assignee_id END,
       status = CASE WHEN $7::boolean THEN $8 ELSE status END,
       due_date = CASE WHEN $9::boolean THEN $10 ELSE due_date END,
       updated_at = $11
     WHERE id = $12
     RETURNING *`,
    [
      input.title !== undefined,
      input.title ?? null,
      input.description !== undefined,
      input.description ?? null,
      input.assigneeId !== undefined,
      input.assigneeId ?? null,
      input.status !== undefined,
      input.status ?? null,
      input.dueDate !== undefined,
      input.dueDate ?? null,
      nowIso(),
      id,
    ]
  );
}
