import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/repo/users";
import { logActivity } from "@/lib/db/repo/activityLog";
import { getCurrentUser, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { badRequest, notFound, ok } from "@/lib/api/respond";
import { loginSchema } from "@/lib/validation/schemas";

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

  const user = getUserById(parsed.data.userId);
  if (!user) return notFound("Демо-аккаунт не найден");

  const store = await cookies();
  store.set(SESSION_COOKIE, user.id, SESSION_COOKIE_OPTIONS);
  logActivity({
    actorId: user.id,
    action: "session.login",
    entityType: "user",
    entityId: user.id,
    metadata: { role: user.role_code },
  });

  return ok({ user: serialize(user) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  if (user) {
    logActivity({
      actorId: user.id,
      action: "session.logout",
      entityType: "user",
      entityId: user.id,
    });
  }
  return ok({ user: null });
}
