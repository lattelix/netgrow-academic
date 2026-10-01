import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canDecideApplication as canDecideAuth, canWithdrawApplication } from "@/lib/domain/authorization";
import { canDecideApplication as canDecideStatus } from "@/lib/domain/eligibility";
import { badRequest, conflict, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { decideApplicationSchema } from "@/lib/validation/schemas";
import {
  decideApplication,
  getApplication,
  getApplicationRaw,
  lockApplicationRow,
  withdrawApplication,
} from "@/lib/db/repo/applications";
import { countApprovedTeamMembers, lockProjectRow } from "@/lib/db/repo/projects";
import { addTeamMember, getOrCreateTeam } from "@/lib/db/repo/teams";
import { serializeApplication } from "@/lib/api/serialize";
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
  const parsed = decideApplicationSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  // Re-read state under the write lock; all dependent writes commit together.
  return withTransaction(async () => {
    const pending = await getApplicationRaw(id);
    if (!pending) return notFound("Заявка не найдена");

    // Fixed lock order (project, then application) avoids deadlocks against
    // other decisions on the same project.
    const project = await lockProjectRow(pending.project_id);
    if (!project) return notFound("Проект не найден");
    const application = await lockApplicationRow(id);
    if (!application) return notFound("Заявка не найдена");

    const actor = toActorContext(user);
    if (!canDecideAuth(actor, project.organizer_id)) return forbidden();
    if (!canDecideStatus(application.status)) {
      return conflict("Решение уже принято по этой заявке");
    }
    if (parsed.data.status === "approved") {
      // Recount under the project lock so a concurrent approval that just
      // committed is reflected before this decision is allowed through.
      const memberCount = await countApprovedTeamMembers(project.id);
      if (memberCount >= project.capacity) {
        return conflict("В команде проекта уже нет свободных мест");
      }
    }
    await decideApplication(id, parsed.data.status, user.id, parsed.data.decisionNote);
    if (parsed.data.status === "approved") {
      const team = await getOrCreateTeam(project.id, `Команда «${project.title}»`);
      await addTeamMember(team.id, application.applicant_id, "member");
    }
    await logActivity({
      actorId: user.id,
      action: parsed.data.status === "approved" ? "application.approved" : "application.rejected",
      entityType: "application",
      entityId: id,
      metadata: { projectId: project.id, applicantId: application.applicant_id },
    });
    return ok(serializeApplication((await getApplication(id))!));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return withTransaction(async () => {
    const application = await lockApplicationRow(id);
    if (!application) return notFound("Заявка не найдена");
    if (!canWithdrawApplication(toActorContext(user), application.applicant_id)) return forbidden();
    if (application.status !== "pending") {
      return conflict("Можно отозвать только заявку в статусе «на рассмотрении»");
    }
    await withdrawApplication(id);
    await logActivity({
      actorId: user.id,
      action: "application.withdrawn",
      entityType: "application",
      entityId: id,
      metadata: { projectId: application.project_id },
    });
    return ok(serializeApplication((await getApplication(id))!));
  });
}
