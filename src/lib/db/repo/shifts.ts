import { queryOne, query } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { ShiftRow, ShiftStatus } from "@/lib/db/types";

export function listShifts(): Promise<ShiftRow[]> {
  return query<ShiftRow>("SELECT * FROM shifts ORDER BY start_date");
}

export function getShift(id: string): Promise<ShiftRow | undefined> {
  return queryOne<ShiftRow>("SELECT * FROM shifts WHERE id = $1", [id]);
}

export interface CreateShiftInput {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status?: ShiftStatus;
}

export async function createShift(input: CreateShiftInput): Promise<ShiftRow> {
  const id = makeId("shift");
  await query(
    `INSERT INTO shifts (id, name, code, start_date, end_date, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, input.name, input.code, input.startDate, input.endDate, input.status ?? "planned", nowIso()]
  );
  return (await getShift(id))!;
}

export interface UpdateShiftInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: ShiftStatus;
}

export async function updateShift(id: string, input: UpdateShiftInput): Promise<ShiftRow | undefined> {
  const current = await getShift(id);
  if (!current) return undefined;
  await query(
    `UPDATE shifts SET name = $1, start_date = $2, end_date = $3, status = $4 WHERE id = $5`,
    [
      input.name ?? current.name,
      input.startDate ?? current.start_date,
      input.endDate ?? current.end_date,
      input.status ?? current.status,
      id,
    ]
  );
  return getShift(id);
}
