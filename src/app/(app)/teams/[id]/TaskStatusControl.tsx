"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { TASK_STATUS_LABELS } from "@/lib/format";
import type { TaskStatus } from "@/lib/db/types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export function TaskStatusControl({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(next: TaskStatus) {
    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Select
      aria-label="Статус задачи"
      value={status}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as TaskStatus)}
      className="w-auto"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {TASK_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
