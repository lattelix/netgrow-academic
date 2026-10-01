import { query, queryOne } from "@/lib/db/client";
import { makeId, nowIso } from "@/lib/db/ids";
import type { AgeGroup, RoleCode, UserRow } from "@/lib/db/types";

export interface UserWithRole extends UserRow {
  role_code: RoleCode;
  role_name: string;
}

const SELECT_WITH_ROLE = `
  SELECT u.*, r.code AS role_code, r.name AS role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

export function listUsers(filter?: { roleCode?: RoleCode; shiftId?: string }): Promise<UserWithRole[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter?.roleCode) {
    params.push(filter.roleCode);
    clauses.push(`r.code = $${params.length}`);
  }
  if (filter?.shiftId) {
    params.push(filter.shiftId);
    clauses.push(`u.shift_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query<UserWithRole>(`${SELECT_WITH_ROLE} ${where} ORDER BY u.full_name`, params);
}

export function getUserById(id: string): Promise<UserWithRole | undefined> {
  return queryOne<UserWithRole>(`${SELECT_WITH_ROLE} WHERE u.id = $1`, [id]);
}

export function getUserByEmail(email: string): Promise<UserWithRole | undefined> {
  return queryOne<UserWithRole>(`${SELECT_WITH_ROLE} WHERE u.email = $1`, [email]);
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  roleId: number;
  shiftId?: string | null;
  ageGroup?: AgeGroup | null;
  bio?: string;
  avatarColor?: string;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const id = makeId("user");
  await query(
    `INSERT INTO users (id, full_name, email, role_id, shift_id, age_group, bio, avatar_color, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.fullName,
      input.email,
      input.roleId,
      input.shiftId ?? null,
      input.ageGroup ?? null,
      input.bio ?? "",
      input.avatarColor ?? "#2F6F5E",
      nowIso(),
    ]
  );
  return (await queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [id]))!;
}

export interface UpdateUserInput {
  fullName?: string;
  bio?: string;
  shiftId?: string | null;
  ageGroup?: AgeGroup | null;
  roleId?: number;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserRow | undefined> {
  const current = await queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  if (!current) return undefined;
  await query(
    `UPDATE users SET full_name = $1, bio = $2, shift_id = $3, age_group = $4, role_id = $5 WHERE id = $6`,
    [
      input.fullName ?? current.full_name,
      input.bio ?? current.bio,
      input.shiftId === undefined ? current.shift_id : input.shiftId,
      input.ageGroup === undefined ? current.age_group : input.ageGroup,
      input.roleId ?? current.role_id,
      id,
    ]
  );
  return queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
}
