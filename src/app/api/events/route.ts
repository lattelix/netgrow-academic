import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { createEventSchema } from "@/lib/validation/schemas";
import { createEvent, listEventsForUser } from "@/lib/db/repo/events";
import { serializeEvent } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { getTeam } from "@/lib/db/repo/teams";
import { getProject } from "@/lib/db/repo/projects";
import { withTransaction } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get("shiftId") ?? undefined;

  // Role-scoped accessible event set: participants get general events plus
  // events of teams they belong to; organizers get general events plus
  // events of teams under projects they organize; admins get every event.
  // `shiftId` only narrows that set further - it must never widen it.
  const events = await listEventsForUser(toActorContext(user), shiftId);
  return ok(events.map(serializeEvent));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const actor = toActorContext(user);
  if (parsed.data.teamId) {
    const team = await getTeam(parsed.data.teamId);
    if (!team) return notFound("Команда не найдена");
    const project = await getProject(team.project_id);
    if (!project || !canManageTeam(actor, project.organizer_id)) return forbidden();
    if (project.shift_id !== parsed.data.shiftId) {
      return badRequest("Смена события должна совпадать со сменой проекта команды");
    }
  } else if (actor.role === "participant") {
    return forbidden("Только организатор или администратор может создавать общие события");
  }

  const event = await withTransaction(async () => {
    const created = await createEvent({ ...parsed.data, createdBy: user.id });
    await logActivity({
      actorId: user.id,
      action: "event.created",
      entityType: "event",
      entityId: created.id,
      metadata: { title: created.title },
    });
    return created;
  });

  return ok(serializeEvent({ ...event, team_name: null }), 201);
}
