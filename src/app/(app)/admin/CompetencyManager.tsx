"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";

interface CompetencyItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

export function CompetencyManager({ competencies }: { competencies: CompetencyItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", description: "" });
  const [error, setError] = useState<string | null>(null);

  async function createCompetency(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/competencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось добавить компетенцию.");
        return;
      }
      setForm({ name: "", category: "", description: "" });
      router.refresh();
    } catch {
      setError("Сервер недоступен.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Удалить компетенцию?")) return;
    setPendingId(id);
    try {
      await fetch(`/api/competencies/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const byCategory = competencies.reduce<Record<string, CompetencyItem[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-muted)]">{category}</h3>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-sm">{c.name}</span>
                <button
                  type="button"
                  aria-label={`Удалить компетенцию ${c.name}`}
                  onClick={() => remove(c.id)}
                  disabled={pendingId === c.id}
                  className="rounded-[8px] p-1.5 text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-[var(--color-danger)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <form onSubmit={createCompetency} className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
        <FormField label="Название" htmlFor="comp-name">
          <Input id="comp-name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
        </FormField>
        <FormField label="Категория" htmlFor="comp-category">
          <Input
            id="comp-category"
            value={form.category}
            onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Описание" htmlFor="comp-description">
          <Input
            id="comp-description"
            value={form.description}
            onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
          />
        </FormField>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)] sm:col-span-3">
            {error}
          </p>
        )}
        <div className="sm:col-span-3">
          <Button type="submit">Добавить компетенцию</Button>
        </div>
      </form>
    </div>
  );
}
