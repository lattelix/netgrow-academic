import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/domain/authorization";
import { forbidden, ok, unauthorized } from "@/lib/api/respond";
import { getAnalyticsSummary } from "@/lib/db/repo/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const actor = toActorContext(user);
  if (!canViewAnalytics(actor)) return forbidden();

  return ok(await getAnalyticsSummary(actor));
}
