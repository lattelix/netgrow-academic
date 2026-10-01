import { getCurrentUser } from "@/lib/auth/session";
import { ok, unauthorized } from "@/lib/api/respond";
import { listUsers } from "@/lib/db/repo/users";
import { serializeUser } from "@/lib/api/serialize";
import type { RoleCode } from "@/lib/db/types";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const roleCode = searchParams.get("role") as RoleCode | null;
  const shiftId = searchParams.get("shiftId");

  const users = listUsers({
    roleCode: roleCode ?? undefined,
    shiftId: shiftId ?? undefined,
  });
  return ok(users.map(serializeUser));
}
