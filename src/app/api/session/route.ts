import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/repo/users";
import { logActivity } from "@/lib/db/repo/activityLog";
import { getCurrentUser, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { badRequest, notFound, ok } from "@/lib/api/respond";
import { loginSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

function serialize(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    roleCode: user.role_code,
    roleName: user.role_name,
    shiftId: user.shift_id,
    ageGroup: user.age_group,
    bio: user.bio,
    avatarColor: user.avatar_color,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  return ok({ user: user ? serialize(user) : null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const user = await getUserById(parsed.data.userId);
  if (!user) return notFound("Демо-аккаунт не найден");

  // The session cookie is not part of the database transaction, so the audit
  // record is written first: if it fails, the request fails before the
  // cookie is set, rather than granting a session with no audit trail.
  await logActivity({
    actorId: user.id,
    action: "session.login",
    entityType: "user",
    entityId: user.id,
    metadata: { role: user.role_code },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, user.id, SESSION_COOKIE_OPTIONS);

  return ok({ user: serialize(user) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  // Same ordering as login: log before mutating the (non-transactional)
  // cookie, so a logout is never silently unaudited.
  if (user) {
    await logActivity({
      actorId: user.id,
      action: "session.logout",
      entityType: "user",
      entityId: user.id,
    });
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return ok({ user: null });
}
