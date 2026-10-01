import { query, queryOne } from "@/lib/db/client";
import type { RoleCode, RoleRow } from "@/lib/db/types";

export function listRoles(): Promise<RoleRow[]> {
  return query<RoleRow>("SELECT * FROM roles ORDER BY id");
}

export function getRoleByCode(code: RoleCode): Promise<RoleRow | undefined> {
  return queryOne<RoleRow>("SELECT * FROM roles WHERE code = $1", [code]);
}

export function getRoleById(id: number): Promise<RoleRow | undefined> {
  return queryOne<RoleRow>("SELECT * FROM roles WHERE id = $1", [id]);
}
