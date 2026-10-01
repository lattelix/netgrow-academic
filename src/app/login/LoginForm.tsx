"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { ROLE_LABELS, initials } from "@/lib/format";
import type { RoleCode } from "@/lib/db/types";

interface DemoAccount {
  id: string;
  fullName: string;
  email: string;
  roleCode: RoleCode;
  roleName: string;
  avatarColor: string;
}

const ROLE_ORDER: RoleCode[] = ["participant", "organizer", "admin"];

export function LoginForm() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<DemoAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo-accounts")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: DemoAccount[]) => setAccounts(data))
      .catch(() => setLoadError(true));
  }, []);

  async function handleSelect(account: DemoAccount) {
    setPendingId(account.id);
    setFormError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id }),
      });
      if (!res.ok) {
        setFormError("Не удалось выполнить вход. Попробуйте ещё раз.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFormError("Сервер недоступен. Попробуйте ещё раз.");
    } finally {
      setPendingId(null);
    }
  }

  if (loadError) {
    return <ErrorState description="Не удалось загрузить список демо-аккаунтов." />;
  }

  if (!accounts) {
    return <LoadingState label="Загружаем демо-аккаунты…" />;
  }

  return (
    <div className="space-y-6">
      {formError && (
        <p role="alert" className="rounded-[8px] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {formError}
        </p>
      )}
      {ROLE_ORDER.map((role) => {
        const roleAccounts = accounts.filter((a) => a.roleCode === role);
        if (roleAccounts.length === 0) return null;
        return (
          <section key={role} aria-labelledby={`role-${role}`}>
            <h2 id={`role-${role}`} className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
              {ROLE_LABELS[role]}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {roleAccounts.map((account) => (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(account)}
                    disabled={pendingId !== null}
                    className="flex w-full items-center gap-3 rounded-[8px] border border-[var(--color-border)] bg-white p-3 text-left transition-colors hover:border-[var(--color-accent)] disabled:opacity-50"
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: account.avatarColor }}
                    >
                      {initials(account.fullName)}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{account.fullName}</span>
                      <span className="block text-xs text-[var(--color-text-muted)]">{account.email}</span>
                    </span>
                    {pendingId === account.id && (
                      <span className="ml-auto text-xs text-[var(--color-text-muted)]">Вход…</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="text-xs text-[var(--color-text-muted)]">
        Это демонстрационный вход без пароля: выберите роль, чтобы посмотреть систему её глазами.
      </p>
    </div>
  );
}
