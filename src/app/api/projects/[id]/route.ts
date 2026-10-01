import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canEditProject } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { updateProjectSchema } from "@/lib/validation/schemas";
import {
  getProject,
  listProjectCompetencies,
  setProjectCompetencies,
  updateProject,
} from "@/lib/db/repo/projects";
import { serializeProject, serializeProjectCompetency } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return notFound("Проект не найден");
  const competencies = listProjectCompetencies(id);
  return ok({
    ...serializeProject(project),
    competencies: competencies.map(serializeProjectCompetency),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const existing = getProject(id);
  if (!existing) return notFound("Проект не найден");

  const actor = toActorContext(user);
  if (!canEditProject(actor, existing.organizer_id)) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const updated = updateProject(id, {
    title: parsed.data.title,
    description: parsed.data.description,
    direction: parsed.data.direction,
    ageGroup: parsed.data.ageGroup,
    capacity: parsed.data.capacity,
    status: parsed.data.status,
  });
  if (parsed.data.competencies) {
    setProjectCompetencies(id, parsed.data.competencies);
  }

  logActivity({
    actorId: user.id,
    action: "project.updated",
    entityType: "project",
    entityId: id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  const full = getProject(id);
  const competencies = listProjectCompetencies(id);
  return ok({
    ...(full ? serializeProject(full) : updated),
    competencies: competencies.map(serializeProjectCompetency),
  });
}
