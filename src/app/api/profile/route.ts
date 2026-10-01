import { getCurrentUser } from "@/lib/auth/session";
import { badRequest, ok, unauthorized } from "@/lib/api/respond";
import { updateProfileSchema } from "@/lib/validation/schemas";
import { getUserById, updateUser } from "@/lib/db/repo/users";
import { listUserCompetencies } from "@/lib/db/repo/competencies";
import { serializeUser, serializeUserCompetency } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const competencies = await listUserCompetencies(user.id);
  return ok({ ...serializeUser(user), competencies: competencies.map(serializeUserCompetency) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  await updateUser(user.id, parsed.data);
  await logActivity({
    actorId: user.id,
    action: "profile.updated",
    entityType: "user",
    entityId: user.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  const updated = (await getUserById(user.id))!;
  const competencies = await listUserCompetencies(user.id);
  return ok({ ...serializeUser(updated), competencies: competencies.map(serializeUserCompetency) });
}
