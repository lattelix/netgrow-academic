import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/domain/authorization";
import { forbidden, ok, unauthorized } from "@/lib/api/respond";
import { getAnalyticsSummary } from "@/lib/db/repo/analytics";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!canViewAnalytics(toActorContext(user))) return forbidden();

  return ok(getAnalyticsSummary());
}
