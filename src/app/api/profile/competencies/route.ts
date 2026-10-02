import { getCurrentUser } from "@/lib/auth/session";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api/respond";
import { upsertUserCompetencySchema } from "@/lib/validation/schemas";
import { getCompetency, listUserCompetencies, upsertUserCompetency } from "@/lib/db/repo/competencies";
import { serializeUserCompetency } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { withTransaction } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return ok((await listUserCompetencies(user.id)).map(serializeUserCompetency));
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = upsertUserCompetencySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const competency = await getCompetency(parsed.data.competencyId);
  if (!competency) return notFound("Компетенция не найдена");

  const competencies = await withTransaction(async () => {
    await upsertUserCompetency(user.id, parsed.data.competencyId, parsed.data.level);
    await logActivity({
      actorId: user.id,
      action: "profile.competency_updated",
      entityType: "user",
      entityId: user.id,
      metadata: { competencyId: parsed.data.competencyId, level: parsed.data.level },
    });
    return listUserCompetencies(user.id);
  });

  return ok(competencies.map(serializeUserCompetency));
}
