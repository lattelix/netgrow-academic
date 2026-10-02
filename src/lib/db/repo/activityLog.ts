import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { ActivityLogRow } from "@/lib/db/types";
import { canViewAnalytics, type ActorContext } from "@/lib/domain/authorization";

export interface LogInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: LogInput): Promise<ActivityLogRow> {
  const id = makeId("log");
  const createdAt = nowIso();
  await query(
    `INSERT INTO activity_log (id, actor_id, action, entity_type, entity_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, input.actorId, input.action, input.entityType, input.entityId, JSON.stringify(input.metadata ?? {}), createdAt]
  );
  return (await queryOne<ActivityLogRow>("SELECT * FROM activity_log WHERE id = $1", [id]))!;
}

export interface ActivityLogWithActor extends ActivityLogRow {
  actor_name: string | null;
}

export function listRecentActivity(actor: ActorContext, limit = 20): Promise<ActivityLogWithActor[]> {
  if (!canViewAnalytics(actor)) throw new Error("Activity access denied");
  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
  const scoped = actor.role === "organizer";
  const scope = scoped ? `WHERE (
    (al.entity_type = 'project' AND EXISTS (
      SELECT 1 FROM projects p WHERE p.id = al.entity_id AND p.organizer_id = $1
    )) OR (al.entity_type = 'application' AND EXISTS (
      SELECT 1 FROM applications a JOIN projects p ON p.id = a.project_id
      WHERE a.id = al.entity_id AND p.organizer_id = $1
    )) OR (al.entity_type = 'team' AND EXISTS (
      SELECT 1 FROM teams t JOIN projects p ON p.id = t.project_id
      WHERE t.id = al.entity_id AND p.organizer_id = $1
    )) OR (al.entity_type = 'task' AND EXISTS (
      SELECT 1 FROM tasks task JOIN teams t ON t.id = task.team_id JOIN projects p ON p.id = t.project_id
      WHERE task.id = al.entity_id AND p.organizer_id = $1
    )) OR (al.entity_type = 'event' AND EXISTS (
      SELECT 1 FROM events e JOIN teams t ON t.id = e.team_id JOIN projects p ON p.id = t.project_id
      WHERE e.id = al.entity_id AND p.organizer_id = $1
    ))
  )` : "";
  return query<ActivityLogWithActor>(
    `SELECT al.*, u.full_name AS actor_name
     FROM activity_log al
     LEFT JOIN users u ON u.id = al.actor_id
     ${scope}
     ORDER BY al.created_at DESC, al.id DESC
     LIMIT $${scoped ? 2 : 1}`,
    scoped ? [actor.userId, boundedLimit] : [boundedLimit]
  );
}
