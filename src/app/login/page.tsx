import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--color-accent)] text-lg font-bold text-white">
          NG
        </span>
        <h1 className="text-2xl font-semibold">NetGrow</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Информационная система формирования проектных команд лагеря
        </p>
      </div>
      <div className="rounded-[8px] border border-[var(--color-border)] bg-white p-5">
        <h2 className="sr-only">Демо-вход</h2>
        <LoginForm />
      </div>
    </div>
  );
}
