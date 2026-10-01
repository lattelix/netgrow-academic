import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageReferenceData } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { updateUserRoleSchema } from "@/lib/validation/schemas";
import { getUserById, updateUser } from "@/lib/db/repo/users";
import { getRoleByCode } from "@/lib/db/repo/roles";
import { serializeUser } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const target = await getUserById(id);
  if (!target) return notFound("Пользователь не найден");
  return ok(serializeUser(target));
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canManageReferenceData(toActorContext(user))) return forbidden();

  const existing = await getUserById(id);
  if (!existing) return notFound("Пользователь не найден");

  const body = await request.json().catch(() => null);
  const parsed = updateUserRoleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const role = await getRoleByCode(parsed.data.roleCode);
  if (!role) return badRequest("Неизвестная роль");

  await updateUser(id, { roleId: role.id });
  await logActivity({
    actorId: user.id,
    action: "user.role_changed",
    entityType: "user",
    entityId: id,
    metadata: { roleCode: parsed.data.roleCode },
  });

  const updated = (await getUserById(id))!;
  return ok(serializeUser(updated));
}
