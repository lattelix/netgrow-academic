import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canEditProject } from "@/lib/domain/authorization";
import { badRequest, conflict, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { updateProjectSchema } from "@/lib/validation/schemas";
import {
  countApprovedTeamMembers,
  getProject,
  listProjectCompetencies,
  lockProjectRow,
  setProjectCompetencies,
  updateProject,
} from "@/lib/db/repo/projects";
import { serializeProject, serializeProjectCompetency } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { withTransaction } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const project = await getProject(id);
  if (!project) return notFound("Проект не найден");
  const competencies = await listProjectCompetencies(id);
  return ok({
    ...serializeProject(project),
    competencies: competencies.map(serializeProjectCompetency),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const existing = await getProject(id);
  if (!existing) return notFound("Проект не найден");

  const actor = toActorContext(user);
  if (!canEditProject(actor, existing.organizer_id)) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  return withTransaction(async () => {
    // Use the same project lock as application approval. This makes reducing
    // capacity race-safe against a concurrent approval.
    const locked = await lockProjectRow(id);
    if (!locked) return notFound("Проект не найден");
    if (!canEditProject(actor, locked.organizer_id)) return forbidden();

    if (parsed.data.capacity !== undefined) {
      const memberCount = await countApprovedTeamMembers(id);
      if (parsed.data.capacity < memberCount) {
        return conflict("Вместимость проекта не может быть меньше текущего состава команды", {
          memberCount,
        });
      }
    }

    const updated = await updateProject(id, {
      title: parsed.data.title,
      description: parsed.data.description,
      direction: parsed.data.direction,
      ageGroup: parsed.data.ageGroup,
      capacity: parsed.data.capacity,
      status: parsed.data.status,
    });
    if (parsed.data.competencies) {
      await setProjectCompetencies(id, parsed.data.competencies);
    }

    await logActivity({
      actorId: user.id,
      action: "project.updated",
      entityType: "project",
      entityId: id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    const full = await getProject(id);
    const competencies = await listProjectCompetencies(id);
    return ok({
      ...(full ? serializeProject(full) : updated),
      competencies: competencies.map(serializeProjectCompetency),
    });
  });
}
