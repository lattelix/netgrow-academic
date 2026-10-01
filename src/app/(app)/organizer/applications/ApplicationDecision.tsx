"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ApplicationDecision({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "approved" | "rejected") {
    setPending(status);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось принять решение.");
        return;
      }
      router.refresh();
    } catch {
      setError("Сервер недоступен.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => decide("approved")} disabled={pending !== null}>
          {pending === "approved" ? "Одобряем…" : "Одобрить"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => decide("rejected")} disabled={pending !== null}>
          {pending === "rejected" ? "Отклоняем…" : "Отклонить"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
