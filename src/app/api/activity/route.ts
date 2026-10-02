import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/domain/authorization";
import { forbidden, ok, unauthorized } from "@/lib/api/respond";
import { listRecentActivity } from "@/lib/db/repo/activityLog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const actor = toActorContext(user);
  if (!canViewAnalytics(actor)) return forbidden();

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  // listRecentActivity clamps to a finite, positive 1..100 range itself, so
  // any non-numeric, negative, fractional, or oversized input is handled there.
  const items = await listRecentActivity(actor, limit);
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
