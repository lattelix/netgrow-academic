import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { getProject } from "@/lib/db/repo/projects";
import { getTeamByProject, isTeamMember, listTeamMembers } from "@/lib/db/repo/teams";
import { listTasksByTeam } from "@/lib/db/repo/tasks";
import { serializeTask, serializeTeam, serializeTeamMember } from "@/lib/api/serialize";
import { canManageTeam } from "@/lib/domain/authorization";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) return notFound("Проект не найден");

  const team = getTeamByProject(projectId);
  if (!team) return notFound("Команда для этого проекта ещё не сформирована");

  const actor = toActorContext(user);
  if (!isTeamMember(team.id, user.id) && !canManageTeam(actor, project.organizer_id)) {
    return forbidden();
  }

  const members = listTeamMembers(team.id);
  const tasks = listTasksByTeam(team.id);

  return ok({
    ...serializeTeam(team),
    members: members.map(serializeTeamMember),
    tasks: tasks.map(serializeTask),
  });
}
