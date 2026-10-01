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

export async function updateTask(id: string, input: UpdateTaskInput): Promise<TaskRow | undefined> {
  const current = await getTask(id);
  if (!current) return undefined;
  await query(
    `UPDATE tasks SET title = $1, description = $2, assignee_id = $3,
      status = $4, due_date = $5, updated_at = $6
     WHERE id = $7`,
    [
      input.title ?? current.title,
      input.description ?? current.description,
      input.assigneeId === undefined ? current.assignee_id : input.assigneeId,
      input.status ?? current.status,
      input.dueDate === undefined ? current.due_date : input.dueDate,
      nowIso(),
      id,
    ]
  );
  return getTask(id);
}
