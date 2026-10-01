import { listUsers } from "@/lib/db/repo/users";
import { ok } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await listUsers();
  return ok(
    users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      roleCode: u.role_code,
      roleName: u.role_name,
      avatarColor: u.avatar_color,
    }))
  );
}
