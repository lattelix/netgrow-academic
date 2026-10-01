import { getDb } from "@/lib/db/client";
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

export function listUsers(filter?: { roleCode?: RoleCode; shiftId?: string }): UserWithRole[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter?.roleCode) {
    clauses.push("r.code = @roleCode");
    params.roleCode = filter.roleCode;
  }
  if (filter?.shiftId) {
    clauses.push("u.shift_id = @shiftId");
    params.shiftId = filter.shiftId;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`${SELECT_WITH_ROLE} ${where} ORDER BY u.full_name`)
    .all(params) as UserWithRole[];
}

export function getUserById(id: string): UserWithRole | undefined {
  return getDb()
    .prepare(`${SELECT_WITH_ROLE} WHERE u.id = @id`)
    .get({ id }) as UserWithRole | undefined;
}

export function getUserByEmail(email: string): UserWithRole | undefined {
  return getDb()
    .prepare(`${SELECT_WITH_ROLE} WHERE u.email = @email`)
    .get({ email }) as UserWithRole | undefined;
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

export function createUser(input: CreateUserInput): UserRow {
  const id = makeId("user");
  getDb()
    .prepare(
      `INSERT INTO users (id, full_name, email, role_id, shift_id, age_group, bio, avatar_color, created_at)
       VALUES (@id, @fullName, @email, @roleId, @shiftId, @ageGroup, @bio, @avatarColor, @createdAt)`
    )
    .run({
      id,
      fullName: input.fullName,
      email: input.email,
      roleId: input.roleId,
      shiftId: input.shiftId ?? null,
      ageGroup: input.ageGroup ?? null,
      bio: input.bio ?? "",
      avatarColor: input.avatarColor ?? "#2F6F5E",
      createdAt: nowIso(),
    });
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
}

export interface UpdateUserInput {
  fullName?: string;
  bio?: string;
  shiftId?: string | null;
  ageGroup?: AgeGroup | null;
  roleId?: number;
}

export function updateUser(id: string, input: UpdateUserInput): UserRow | undefined {
  const current = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
  if (!current) return undefined;
  getDb()
    .prepare(
      `UPDATE users SET full_name = @fullName, bio = @bio, shift_id = @shiftId, age_group = @ageGroup, role_id = @roleId WHERE id = @id`
    )
    .run({
      id,
      fullName: input.fullName ?? current.full_name,
      bio: input.bio ?? current.bio,
      shiftId: input.shiftId === undefined ? current.shift_id : input.shiftId,
      ageGroup: input.ageGroup === undefined ? current.age_group : input.ageGroup,
      roleId: input.roleId ?? current.role_id,
    });
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
}
