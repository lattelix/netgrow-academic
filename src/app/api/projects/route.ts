import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canCreateProject } from "@/lib/domain/authorization";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/api/respond";
import { createProjectSchema } from "@/lib/validation/schemas";
import {
  createProject,
  getProject,
  listProjects,
  setProjectCompetencies,
  type ProjectFilter,
} from "@/lib/db/repo/projects";
import { serializeProject } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { withTransaction } from "@/lib/db/client";
import type { ProjectAgeGroup, ProjectStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const filter: ProjectFilter = {
    direction: searchParams.get("direction") ?? undefined,
    ageGroup: (searchParams.get("ageGroup") as ProjectAgeGroup | null) ?? undefined,
    status: (searchParams.get("status") as ProjectStatus | null) ?? undefined,
    search: searchParams.get("search") ?? undefined,
    organizerId: searchParams.get("organizerId") ?? undefined,
  };
  const competencyIds = searchParams.getAll("competencyId");
  if (competencyIds.length > 0) filter.competencyIds = competencyIds;

  const projects = await listProjects(filter);
  return ok(projects.map(serializeProject));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const actor = toActorContext(user);
  if (!canCreateProject(actor)) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const { project, full } = await withTransaction(async () => {
    const project = await createProject({
      title: parsed.data.title,
      description: parsed.data.description,
      direction: parsed.data.direction,
      ageGroup: parsed.data.ageGroup,
      shiftId: parsed.data.shiftId,
      organizerId: user.id,
      capacity: parsed.data.capacity,
      status: parsed.data.status,
    });
    if (parsed.data.competencies.length > 0) {
      await setProjectCompetencies(project.id, parsed.data.competencies);
    }

    await logActivity({
      actorId: user.id,
      action: "project.created",
      entityType: "project",
      entityId: project.id,
      metadata: { title: project.title },
    });

    const full = await getProject(project.id);
    return { project, full };
  });

  return ok(full ? serializeProject(full) : project, 201);
}
