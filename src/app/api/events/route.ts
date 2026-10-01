import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/domain/authorization";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { createEventSchema } from "@/lib/validation/schemas";
import { createEvent, listEventsForUser } from "@/lib/db/repo/events";
import { serializeEvent } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { getTeam } from "@/lib/db/repo/teams";
import { getProject } from "@/lib/db/repo/projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get("shiftId") ?? undefined;

  // `shiftId` only narrows the caller's own accessible event set (general
  // events plus their own teams' events); it must never widen it to events
  // of teams the caller isn't a member of, regardless of role.
  const events = await listEventsForUser(user.id, shiftId);
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
  } else if (actor.role === "participant") {
    return forbidden("Только организатор или администратор может создавать общие события");
  }

  const event = await createEvent({ ...parsed.data, createdBy: user.id });
  await logActivity({
    actorId: user.id,
    action: "event.created",
    entityType: "event",
    entityId: event.id,
    metadata: { title: event.title },
  });

  return ok(serializeEvent({ ...event, team_name: null }), 201);
}
