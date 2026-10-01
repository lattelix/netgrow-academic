import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canUpdateTask } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { updateTaskSchema } from "@/lib/validation/schemas";
import { getTask, listTasksByTeam, updateTask } from "@/lib/db/repo/tasks";
import { getTeam, isTeamMember } from "@/lib/db/repo/teams";
import { getProject } from "@/lib/db/repo/projects";
import { serializeTask } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const task = await getTask(id);
  if (!task) return notFound("Задача не найдена");
  const team = await getTeam(task.team_id);
  if (!team) return notFound("Команда не найдена");
  const project = await getProject(team.project_id);
  if (!project) return notFound("Проект не найден");

  const actor = toActorContext(user);
  if (!canUpdateTask(actor, project.organizer_id, task.assignee_id)) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const isManager = actor.role === "admin" || actor.userId === project.organizer_id;
  if (!isManager && Object.keys(parsed.data).some((k) => k !== "status")) {
    return forbidden("Исполнитель может менять только статус задачи");
  }

  if (parsed.data.assigneeId && !(await isTeamMember(team.id, parsed.data.assigneeId))) {
    return badRequest("Исполнитель должен быть участником команды");
  }

  await updateTask(id, parsed.data);

  await logActivity({
    actorId: user.id,
    action: "task.updated",
    entityType: "task",
    entityId: id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  const [withDetails] = (await listTasksByTeam(team.id)).filter((t) => t.id === id);
  return ok(withDetails ? serializeTask(withDetails) : await getTask(id));
}
