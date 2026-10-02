import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canListUsers } from "@/lib/domain/authorization";
import { forbidden, ok, unauthorized } from "@/lib/api/respond";
import { listUsers } from "@/lib/db/repo/users";
import { serializeUser } from "@/lib/api/serialize";
import type { RoleCode } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canListUsers(toActorContext(user))) return forbidden();

  const { searchParams } = new URL(request.url);
  const roleCode = searchParams.get("role") as RoleCode | null;
  const shiftId = searchParams.get("shiftId");

  const users = await listUsers({
    roleCode: roleCode ?? undefined,
    shiftId: shiftId ?? undefined,
  });
  return ok(users.map(serializeUser));
}
