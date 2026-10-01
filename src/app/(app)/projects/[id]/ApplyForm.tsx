"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

export function ApplyForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        const reasons = data?.error?.details?.reasons as { message: string }[] | undefined;
        setError(reasons?.map((r) => r.message).join(" ") ?? data?.error?.message ?? "Не удалось подать заявку.");
        return;
      }
      router.refresh();
    } catch {
      setError("Сервер недоступен. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Форма подачи заявки">
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium">
          Сопроводительное сообщение (необязательно)
        </label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Расскажите, почему хотите участвовать в проекте"
          maxLength={1000}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Отправка…" : "Подать заявку"}
      </Button>
    </form>
  );
}
