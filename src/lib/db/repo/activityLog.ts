import { getDb } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { ActivityLogRow } from "@/lib/db/types";

export interface LogInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export function logActivity(input: LogInput): ActivityLogRow {
  const id = makeId("log");
  const createdAt = nowIso();
  getDb()
    .prepare(
      `INSERT INTO activity_log (id, actor_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (@id, @actorId, @action, @entityType, @entityId, @metadata, @createdAt)`
    )
    .run({
      id,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: JSON.stringify(input.metadata ?? {}),
      createdAt,
    });
  return getDb().prepare("SELECT * FROM activity_log WHERE id = ?").get(id) as ActivityLogRow;
}

export interface ActivityLogWithActor extends ActivityLogRow {
  actor_name: string | null;
}

export function listRecentActivity(limit = 20): ActivityLogWithActor[] {
  return getDb()
    .prepare(
      `SELECT al.*, u.full_name AS actor_name
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT ?`
    )
    .all(limit) as ActivityLogWithActor[];
}
