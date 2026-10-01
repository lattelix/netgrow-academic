import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { ActivityLogRow } from "@/lib/db/types";

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

export function listRecentActivity(limit = 20): Promise<ActivityLogWithActor[]> {
  return query<ActivityLogWithActor>(
    `SELECT al.*, u.full_name AS actor_name
     FROM activity_log al
     LEFT JOIN users u ON u.id = al.actor_id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
}
