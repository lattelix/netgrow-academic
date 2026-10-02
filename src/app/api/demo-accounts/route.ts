import { listUsers } from "@/lib/db/repo/users";
import { ok } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

// Intentionally public and unauthenticated: this powers the demo account
// picker on the login screen, before any session exists. All data is
// synthetic, and the field set stays a narrow selector (no bio/competencies)
// - it is not a general profile API, which is gated by canListUsers/canReadUser.
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
