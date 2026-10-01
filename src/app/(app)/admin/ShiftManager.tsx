"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { SHIFT_STATUS_LABELS } from "@/lib/format";
import type { ShiftStatus } from "@/lib/db/types";

interface ShiftItem {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: ShiftStatus;
}

const STATUSES: ShiftStatus[] = ["planned", "active", "completed"];

export function ShiftManager({ shifts }: { shifts: ShiftItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", startDate: "", endDate: "" });
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(id: string, status: ShiftStatus) {
    setPendingId(id);
    try {
      await fetch(`/api/shifts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function createShift(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось создать смену.");
        return;
      }
      setForm({ name: "", code: "", startDate: "", endDate: "" });
      router.refresh();
    } catch {
      setError("Сервер недоступен.");
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-[var(--color-border)]">
        {shifts.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {s.code} · {s.startDate} — {s.endDate}
              </p>
            </div>
            <Select
              aria-label={`Статус смены: ${s.name}`}
              value={s.status}
              disabled={pendingId === s.id}
              onChange={(e) => updateStatus(s.id, e.target.value as ShiftStatus)}
              className="w-auto"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {SHIFT_STATUS_LABELS[st]}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>

      <form onSubmit={createShift} className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
        <FormField label="Название" htmlFor="shift-name">
          <Input id="shift-name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
        </FormField>
        <FormField label="Код" htmlFor="shift-code">
          <Input id="shift-code" value={form.code} onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))} required />
        </FormField>
        <FormField label="Дата начала" htmlFor="shift-start">
          <Input
            id="shift-start"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((v) => ({ ...v, startDate: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Дата окончания" htmlFor="shift-end">
          <Input
            id="shift-end"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((v) => ({ ...v, endDate: e.target.value }))}
            required
          />
        </FormField>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)] sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit">Добавить смену</Button>
        </div>
      </form>
    </div>
  );
}
