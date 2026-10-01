import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { EventRow, EventType } from "@/lib/db/types";

export interface EventWithTeam extends EventRow {
  team_name: string | null;
}

/** Full shift calendar, unfiltered by membership. Only safe for roles that are
 * already allowed to see every team's events for a shift (organizer/admin UI). */
export function listEventsByShift(shiftId: string): Promise<EventWithTeam[]> {
  return query<EventWithTeam>(
    `SELECT e.*, t.name AS team_name
     FROM events e
     LEFT JOIN teams t ON t.id = e.team_id
     WHERE e.shift_id = $1
     ORDER BY e.starts_at`,
    [shiftId]
  );
}

/**
 * The accessible-event set for a user: general events (no team) plus events
 * of teams they belong to. An optional `shiftId` may only narrow this set
 * further (e.g. for a shift-scoped calendar view) - it must never be used to
 * widen access to other teams' events.
 */
export function listEventsForUser(userId: string, shiftId?: string): Promise<EventWithTeam[]> {
  const params: unknown[] = [userId];
  const clauses = ["(e.team_id IS NULL OR e.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1))"];
  if (shiftId) {
    params.push(shiftId);
    clauses.push(`e.shift_id = $${params.length}`);
  }
  return query<EventWithTeam>(
    `SELECT e.*, t.name AS team_name
     FROM events e
     LEFT JOIN teams t ON t.id = e.team_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY e.starts_at`,
    params
  );
}

export interface CreateEventInput {
  shiftId: string;
  teamId?: string | null;
  title: string;
  description?: string;
  eventType?: EventType;
  startsAt: string;
  endsAt: string;
  location?: string;
  createdBy: string;
}

export async function createEvent(input: CreateEventInput): Promise<EventRow> {
  const id = makeId("evt");
  await query(
    `INSERT INTO events (id, shift_id, team_id, title, description, event_type, starts_at, ends_at, location, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      input.shiftId,
      input.teamId ?? null,
      input.title,
      input.description ?? "",
      input.eventType ?? "other",
      input.startsAt,
      input.endsAt,
      input.location ?? "",
      input.createdBy,
      nowIso(),
    ]
  );
  return (await queryOne<EventRow>("SELECT * FROM events WHERE id = $1", [id]))!;
}
