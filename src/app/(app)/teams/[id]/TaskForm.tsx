"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";

interface MemberOption {
  userId: string;
  fullName: string;
}

export function TaskForm({ teamId, members }: { teamId: string; members: MemberOption[] }) {
  const router = useRouter();
  const [values, setValues] = useState({ title: "", description: "", assigneeId: "", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          assigneeId: values.assigneeId || null,
          dueDate: values.dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось создать задачу.");
        return;
      }
      setValues({ title: "", description: "", assigneeId: "", dueDate: "" });
      router.refresh();
    } catch {
      setError("Сервер недоступен.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Форма новой задачи">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Название задачи" htmlFor="task-title">
          <Input
            id="task-title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            required
            minLength={2}
          />
        </FormField>
        <FormField label="Исполнитель" htmlFor="task-assignee">
          <Select
            id="task-assignee"
            value={values.assigneeId}
            onChange={(e) => setValues((v) => ({ ...v, assigneeId: e.target.value }))}
          >
            <option value="">Без исполнителя</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Описание" htmlFor="task-description">
        <Textarea
          id="task-description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </FormField>
      <FormField label="Срок выполнения" htmlFor="task-due">
        <Input
          id="task-due"
          type="date"
          value={values.dueDate}
          onChange={(e) => setValues((v) => ({ ...v, dueDate: e.target.value }))}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Создание…" : "Создать задачу"}
      </Button>
    </form>
  );
}
