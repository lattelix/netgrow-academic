import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { EventRow, EventType } from "@/lib/db/types";
import type { ActorContext } from "@/lib/domain/authorization";

export interface EventWithTeam extends EventRow {
  team_name: string | null;
}

/**
 * General events plus member teams for participants, owned project teams
 * for organizers, all events for admins. Shift filtering only narrows access.
 */
export function listEventsForUser(actor: ActorContext, shiftId?: string): Promise<EventWithTeam[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (actor.role === "participant") {
    params.push(actor.userId);
    clauses.push("(e.team_id IS NULL OR e.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1))");
  } else if (actor.role === "organizer") {
    params.push(actor.userId);
    clauses.push("(e.team_id IS NULL OR EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.organizer_id = $1))");
  } else if (actor.role !== "admin") {
    throw new Error("Unsupported calendar role");
  }
  if (shiftId) {
    params.push(shiftId);
    clauses.push(`e.shift_id = $${params.length}`);
  }
  return query<EventWithTeam>(
    `SELECT e.*, t.name AS team_name
     FROM events e
     LEFT JOIN teams t ON t.id = e.team_id
     ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
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
