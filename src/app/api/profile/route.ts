import { getCurrentUser } from "@/lib/auth/session";
import { badRequest, ok, unauthorized } from "@/lib/api/respond";
import { updateProfileSchema } from "@/lib/validation/schemas";
import { getUserById, updateUser } from "@/lib/db/repo/users";
import { listUserCompetencies } from "@/lib/db/repo/competencies";
import { serializeUser, serializeUserCompetency } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const competencies = listUserCompetencies(user.id);
  return ok({ ...serializeUser(user), competencies: competencies.map(serializeUserCompetency) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  updateUser(user.id, parsed.data);
  logActivity({
    actorId: user.id,
    action: "profile.updated",
    entityType: "user",
    entityId: user.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  const updated = getUserById(user.id)!;
  const competencies = listUserCompetencies(user.id);
  return ok({ ...serializeUser(updated), competencies: competencies.map(serializeUserCompetency) });
}
