import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageReferenceData } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { updateShiftSchema } from "@/lib/validation/schemas";
import { getShift, updateShift } from "@/lib/db/repo/shifts";
import { serializeShift } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { withTransaction } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canManageReferenceData(toActorContext(user))) return forbidden();

  const existing = await getShift(id);
  if (!existing) return notFound("Смена не найдена");

  const body = await request.json().catch(() => null);
  const parsed = updateShiftSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const updated = await withTransaction(async () => {
    const updated = await updateShift(id, parsed.data);
    await logActivity({
      actorId: user.id,
      action: "shift.updated",
      entityType: "shift",
      entityId: id,
    });
    return updated;
  });
  return ok(updated ? serializeShift(updated) : null);
}
