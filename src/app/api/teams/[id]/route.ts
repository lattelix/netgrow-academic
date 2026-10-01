import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { getTeam, isTeamMember, listTeamMembers } from "@/lib/db/repo/teams";
import { listTasksByTeam } from "@/lib/db/repo/tasks";
import { getProject } from "@/lib/db/repo/projects";
import { serializeProject, serializeTask, serializeTeam, serializeTeamMember } from "@/lib/api/serialize";
import { canManageTeam } from "@/lib/domain/authorization";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const team = getTeam(id);
  if (!team) return notFound("Команда не найдена");

  const project = getProject(team.project_id);
  if (!project) return notFound("Проект не найден");

  const actor = toActorContext(user);
  if (!isTeamMember(team.id, user.id) && !canManageTeam(actor, project.organizer_id)) {
    return forbidden();
  }

  const members = listTeamMembers(team.id);
  const tasks = listTasksByTeam(team.id);

  return ok({
    ...serializeTeam(team),
    project: project ? serializeProject(project) : null,
    members: members.map(serializeTeamMember),
    tasks: tasks.map(serializeTask),
  });
}
