import { getCurrentUser } from "@/lib/auth/session";
import { ok, unauthorized } from "@/lib/api/respond";
import { deleteUserCompetency, listUserCompetencies } from "@/lib/db/repo/competencies";
import { serializeUserCompetency } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ competencyId: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { competencyId } = await params;

  await deleteUserCompetency(user.id, competencyId);
  await logActivity({
    actorId: user.id,
    action: "profile.competency_removed",
    entityType: "user",
    entityId: user.id,
    metadata: { competencyId },
  });

  return ok((await listUserCompetencies(user.id)).map(serializeUserCompetency));
}
