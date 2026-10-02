import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageReferenceData } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { updateCompetencySchema } from "@/lib/validation/schemas";
import { deleteCompetency, getCompetency, updateCompetency } from "@/lib/db/repo/competencies";
import { serializeCompetency } from "@/lib/api/serialize";
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

  const existing = await getCompetency(id);
  if (!existing) return notFound("Компетенция не найдена");

  const body = await request.json().catch(() => null);
  const parsed = updateCompetencySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const updated = await withTransaction(async () => {
    const updated = await updateCompetency(id, parsed.data);
    await logActivity({
      actorId: user.id,
      action: "competency.updated",
      entityType: "competency",
      entityId: id,
    });
    return updated;
  });
  return ok(updated ? serializeCompetency(updated) : null);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canManageReferenceData(toActorContext(user))) return forbidden();

  const existing = await getCompetency(id);
  if (!existing) return notFound("Компетенция не найдена");

  await withTransaction(async () => {
    await deleteCompetency(id);
    await logActivity({
      actorId: user.id,
      action: "competency.deleted",
      entityType: "competency",
      entityId: id,
      metadata: { name: existing.name },
    });
  });
  return ok({ deleted: true });
}
