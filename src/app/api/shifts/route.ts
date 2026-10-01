import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageReferenceData } from "@/lib/domain/authorization";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/api/respond";
import { createShiftSchema } from "@/lib/validation/schemas";
import { createShift, listShifts } from "@/lib/db/repo/shifts";
import { serializeShift } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

export async function GET() {
  return ok(listShifts().map(serializeShift));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canManageReferenceData(toActorContext(user))) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = createShiftSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const shift = createShift(parsed.data);
  logActivity({
    actorId: user.id,
    action: "shift.created",
    entityType: "shift",
    entityId: shift.id,
    metadata: { name: shift.name },
  });
  return ok(serializeShift(shift), 201);
}
