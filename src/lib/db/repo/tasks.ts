import { getDb } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { TaskRow, TaskStatus } from "@/lib/db/types";

export interface TaskWithAssignee extends TaskRow {
  assignee_name: string | null;
}

export function listTasksByTeam(teamId: string): TaskWithAssignee[] {
  return getDb()
    .prepare(
      `SELECT t.*, u.full_name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.team_id = ?
       ORDER BY CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.due_date IS NULL, t.due_date`
    )
    .all(teamId) as TaskWithAssignee[];
}

export interface TaskWithProject extends TaskWithAssignee {
  project_title: string;
  project_id: string;
}

export function listTasksByAssignee(userId: string): TaskWithProject[] {
  return getDb()
    .prepare(
      `SELECT t.*, u.full_name AS assignee_name, p.title AS project_title, p.id AS project_id
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       JOIN teams tm ON tm.id = t.team_id
       JOIN projects p ON p.id = tm.project_id
       WHERE t.assignee_id = ?
       ORDER BY CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.due_date IS NULL, t.due_date`
    )
    .all(userId) as TaskWithProject[];
}

export function getTask(id: string): TaskRow | undefined {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | TaskRow
    | undefined;
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

export function createTask(input: CreateTaskInput): TaskRow {
  const id = makeId("task");
  const createdAt = nowIso();
  getDb()
    .prepare(
      `INSERT INTO tasks (id, team_id, title, description, assignee_id, status, due_date, created_by, created_at, updated_at)
       VALUES (@id, @teamId, @title, @description, @assigneeId, @status, @dueDate, @createdBy, @createdAt, @createdAt)`
    )
    .run({
      id,
      teamId: input.teamId,
      title: input.title,
      description: input.description ?? "",
      assigneeId: input.assigneeId ?? null,
      status: input.status ?? "todo",
      dueDate: input.dueDate ?? null,
      createdBy: input.createdBy,
      createdAt,
    });
  return getTask(id)!;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
}

export function updateTask(id: string, input: UpdateTaskInput): TaskRow | undefined {
  const current = getTask(id);
  if (!current) return undefined;
  getDb()
    .prepare(
      `UPDATE tasks SET title = @title, description = @description, assignee_id = @assigneeId,
        status = @status, due_date = @dueDate, updated_at = @updatedAt
       WHERE id = @id`
    )
    .run({
      id,
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      assigneeId: input.assigneeId === undefined ? current.assignee_id : input.assigneeId,
      status: input.status ?? current.status,
      dueDate: input.dueDate === undefined ? current.due_date : input.dueDate,
      updatedAt: nowIso(),
    });
  return getTask(id);
}
