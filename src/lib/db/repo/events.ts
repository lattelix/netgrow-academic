import { getDb } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { EventRow, EventType } from "@/lib/db/types";

export interface EventWithTeam extends EventRow {
  team_name: string | null;
}

export function listEventsByShift(shiftId: string): EventWithTeam[] {
  return getDb()
    .prepare(
      `SELECT e.*, t.name AS team_name
       FROM events e
       LEFT JOIN teams t ON t.id = e.team_id
       WHERE e.shift_id = ?
       ORDER BY e.starts_at`
    )
    .all(shiftId) as EventWithTeam[];
}

export function listEventsForUser(userId: string): EventWithTeam[] {
  return getDb()
    .prepare(
      `SELECT e.*, t.name AS team_name
       FROM events e
       LEFT JOIN teams t ON t.id = e.team_id
       WHERE e.team_id IS NULL
          OR e.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?)
       ORDER BY e.starts_at`
    )
    .all(userId) as EventWithTeam[];
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

export function createEvent(input: CreateEventInput): EventRow {
  const id = makeId("evt");
  getDb()
    .prepare(
      `INSERT INTO events (id, shift_id, team_id, title, description, event_type, starts_at, ends_at, location, created_by, created_at)
       VALUES (@id, @shiftId, @teamId, @title, @description, @eventType, @startsAt, @endsAt, @location, @createdBy, @createdAt)`
    )
    .run({
      id,
      shiftId: input.shiftId,
      teamId: input.teamId ?? null,
      title: input.title,
      description: input.description ?? "",
      eventType: input.eventType ?? "other",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location ?? "",
      createdBy: input.createdBy,
      createdAt: nowIso(),
    });
  return getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow;
}
