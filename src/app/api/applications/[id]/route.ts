import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canDecideApplication as canDecideAuth, canWithdrawApplication } from "@/lib/domain/authorization";
import { canDecideApplication as canDecideStatus } from "@/lib/domain/eligibility";
import { badRequest, conflict, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { decideApplicationSchema } from "@/lib/validation/schemas";
import { decideApplication, getApplication, withdrawApplication } from "@/lib/db/repo/applications";
import { getProject } from "@/lib/db/repo/projects";
import { addTeamMember, getOrCreateTeam } from "@/lib/db/repo/teams";
import { serializeApplication } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { getDb } from "@/lib/db/client";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const parsed = decideApplicationSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  // Re-read state under the write lock; all dependent writes commit together.
  return getDb().transaction(() => {
    const application = getApplication(id);
    if (!application) return notFound("Заявка не найдена");
    const project = getProject(application.project_id);
    if (!project) return notFound("Проект не найден");
    const actor = toActorContext(user);
    if (!canDecideAuth(actor, project.organizer_id)) return forbidden();
    if (!canDecideStatus(application.status)) {
      return conflict("Решение уже принято по этой заявке");
    }
    if (parsed.data.status === "approved" && project.member_count >= project.capacity) {
      return conflict("В команде проекта уже нет свободных мест");
    }
    decideApplication(id, parsed.data.status, user.id, parsed.data.decisionNote);
    if (parsed.data.status === "approved") {
      const team = getOrCreateTeam(project.id, `Команда «${project.title}»`);
      addTeamMember(team.id, application.applicant_id, "member");
    }
    logActivity({
      actorId: user.id,
      action: parsed.data.status === "approved" ? "application.approved" : "application.rejected",
      entityType: "application",
      entityId: id,
      metadata: { projectId: project.id, applicantId: application.applicant_id },
    });
    return ok(serializeApplication(getApplication(id)!));
  }).immediate();
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return getDb().transaction(() => {
    const application = getApplication(id);
    if (!application) return notFound("Заявка не найдена");
    if (!canWithdrawApplication(toActorContext(user), application.applicant_id)) return forbidden();
    if (application.status !== "pending") {
      return conflict("Можно отозвать только заявку в статусе «на рассмотрении»");
    }
    withdrawApplication(id);
    logActivity({
      actorId: user.id,
      action: "application.withdrawn",
      entityType: "application",
      entityId: id,
      metadata: { projectId: application.project_id },
    });
    return ok(serializeApplication(getApplication(id)!));
  }).immediate();
}
