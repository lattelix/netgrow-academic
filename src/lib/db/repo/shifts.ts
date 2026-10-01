import { getDb } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { ShiftRow, ShiftStatus } from "@/lib/db/types";

export function listShifts(): ShiftRow[] {
  return getDb()
    .prepare("SELECT * FROM shifts ORDER BY start_date")
    .all() as ShiftRow[];
}

export function getShift(id: string): ShiftRow | undefined {
  return getDb().prepare("SELECT * FROM shifts WHERE id = ?").get(id) as
    | ShiftRow
    | undefined;
}

export interface CreateShiftInput {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status?: ShiftStatus;
}

export function createShift(input: CreateShiftInput): ShiftRow {
  const id = makeId("shift");
  getDb()
    .prepare(
      `INSERT INTO shifts (id, name, code, start_date, end_date, status, created_at)
       VALUES (@id, @name, @code, @startDate, @endDate, @status, @createdAt)`
    )
    .run({
      id,
      name: input.name,
      code: input.code,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? "planned",
      createdAt: nowIso(),
    });
  return getShift(id)!;
}

export interface UpdateShiftInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: ShiftStatus;
}

export function updateShift(id: string, input: UpdateShiftInput): ShiftRow | undefined {
  const current = getShift(id);
  if (!current) return undefined;
  getDb()
    .prepare(
      `UPDATE shifts SET name = @name, start_date = @startDate, end_date = @endDate, status = @status WHERE id = @id`
    )
    .run({
      id,
      name: input.name ?? current.name,
      startDate: input.startDate ?? current.start_date,
      endDate: input.endDate ?? current.end_date,
      status: input.status ?? current.status,
    });
  return getShift(id);
}
