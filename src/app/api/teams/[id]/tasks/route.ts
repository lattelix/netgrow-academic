import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canCreateTask } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { createTaskSchema } from "@/lib/validation/schemas";
import { getTeam, isTeamMember } from "@/lib/db/repo/teams";
import { getProject } from "@/lib/db/repo/projects";
import { createTask, listTasksByTeam } from "@/lib/db/repo/tasks";
import { serializeTask } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { id: teamId } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const team = await getTeam(teamId);
  if (!team) return notFound("Команда не найдена");
  const project = await getProject(team.project_id);
  if (!project) return notFound("Проект не найден");

  const actor = toActorContext(user);
  if (!canCreateTask(actor, project.organizer_id)) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  if (parsed.data.assigneeId && !(await isTeamMember(teamId, parsed.data.assigneeId))) {
    return badRequest("Исполнитель должен быть участником команды");
  }

  const task = await createTask({
    teamId,
    title: parsed.data.title,
    description: parsed.data.description,
    assigneeId: parsed.data.assigneeId,
    dueDate: parsed.data.dueDate,
    status: parsed.data.status,
    createdBy: user.id,
  });

  await logActivity({
    actorId: user.id,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    metadata: { teamId, title: task.title },
  });

  const [withDetails] = (await listTasksByTeam(teamId)).filter((t) => t.id === task.id);
  return ok(withDetails ? serializeTask(withDetails) : task, 201);
}
