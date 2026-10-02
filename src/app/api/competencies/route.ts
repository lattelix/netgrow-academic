import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageReferenceData } from "@/lib/domain/authorization";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/api/respond";
import { createCompetencySchema } from "@/lib/validation/schemas";
import { createCompetency, listCompetencies } from "@/lib/db/repo/competencies";
import { serializeCompetency } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { withTransaction } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok((await listCompetencies()).map(serializeCompetency));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canManageReferenceData(toActorContext(user))) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = createCompetencySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const competency = await withTransaction(async () => {
    const competency = await createCompetency(parsed.data);
    await logActivity({
      actorId: user.id,
      action: "competency.created",
      entityType: "competency",
      entityId: competency.id,
      metadata: { name: competency.name },
    });
    return competency;
  });
  return ok(serializeCompetency(competency), 201);
}
