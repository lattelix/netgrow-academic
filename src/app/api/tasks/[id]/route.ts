import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canUpdateTask } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { updateTaskSchema } from "@/lib/validation/schemas";
import { listTasksByTeam, lockTaskRow, updateTask } from "@/lib/db/repo/tasks";
import { getTeam, isTeamMember } from "@/lib/db/repo/teams";
import { getProject } from "@/lib/db/repo/projects";
import { serializeTask } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { withTransaction } from "@/lib/db/client";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const actor = toActorContext(user);

  return withTransaction(async () => {
    // Lock before authorization so a concurrent reassignment cannot leave the
    // previous assignee authorized against stale task state.
    const task = await lockTaskRow(id);
    if (!task) return notFound("Задача не найдена");
    const team = await getTeam(task.team_id);
    if (!team) return notFound("Команда не найдена");
    const project = await getProject(team.project_id);
    if (!project) return notFound("Проект не найден");

    if (!canUpdateTask(actor, project.organizer_id, task.assignee_id)) return forbidden();

    const isManager = actor.role === "admin" || actor.userId === project.organizer_id;
    if (!isManager && Object.keys(parsed.data).some((k) => k !== "status")) {
      return forbidden("Исполнитель может менять только статус задачи");
    }

    if (parsed.data.assigneeId && !(await isTeamMember(team.id, parsed.data.assigneeId))) {
      return badRequest("Исполнитель должен быть участником команды");
    }

    const updated = await updateTask(id, parsed.data);
    if (!updated) return notFound("Задача не найдена");

    await logActivity({
      actorId: user.id,
      action: "task.updated",
      entityType: "task",
      entityId: id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    const [withDetails] = (await listTasksByTeam(team.id)).filter((t) => t.id === id);
    return ok(withDetails ? serializeTask(withDetails) : updated);
  });
}
