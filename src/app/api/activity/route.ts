import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/domain/authorization";
import { forbidden, ok, unauthorized } from "@/lib/api/respond";
import { listRecentActivity } from "@/lib/db/repo/activityLog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canViewAnalytics(toActorContext(user))) return forbidden();

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  const items = await listRecentActivity(Number.isFinite(limit) ? limit : 20);
  return ok(
    items.map((i) => ({
      id: i.id,
      actorId: i.actor_id,
      actorName: i.actor_name,
      action: i.action,
      entityType: i.entity_type,
      entityId: i.entity_id,
      metadata: JSON.parse(i.metadata) as Record<string, unknown>,
      createdAt: i.created_at,
    }))
  );
}
