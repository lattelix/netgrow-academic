import { getDb } from "@/lib/db/client";
import type { RoleCode, RoleRow } from "@/lib/db/types";

export function listRoles(): RoleRow[] {
  return getDb().prepare("SELECT * FROM roles ORDER BY id").all() as RoleRow[];
}

export function getRoleByCode(code: RoleCode): RoleRow | undefined {
  return getDb()
    .prepare("SELECT * FROM roles WHERE code = ?")
    .get(code) as RoleRow | undefined;
}

export function getRoleById(id: number): RoleRow | undefined {
  return getDb().prepare("SELECT * FROM roles WHERE id = ?").get(id) as
    | RoleRow
    | undefined;
}
