"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Отозвать заявку на этот проект?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Не удалось отозвать заявку.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Отзываем…" : "Отозвать заявку"}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
