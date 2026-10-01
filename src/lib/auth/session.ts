import { cookies } from "next/headers";
import { getUserById, type UserWithRole } from "@/lib/db/repo/users";
import type { ActorContext } from "@/lib/domain/authorization";

export const SESSION_COOKIE = "netgrow_session";

export async function getCurrentUser(): Promise<UserWithRole | null> {
  const store = await cookies();
  const userId = store.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return (await getUserById(userId)) ?? null;
}

export function toActorContext(user: UserWithRole): ActorContext {
  return { userId: user.id, role: user.role_code };
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Local demo runs over plain HTTP; production deployments must serve HTTPS
  // and enable `secure: true` (documented in docs/security.md).
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};
