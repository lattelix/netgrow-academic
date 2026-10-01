"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { X } from "lucide-react";

interface CompetencyOption {
  id: string;
  name: string;
  category: string;
}

interface OwnedCompetency {
  competencyId: string;
  name: string;
  category: string;
  level: number;
}

interface Props {
  allCompetencies: CompetencyOption[];
  owned: OwnedCompetency[];
}

const LEVELS = [1, 2, 3, 4, 5];

export function CompetencyEditor({ allCompetencies, owned }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState("");

  const available = allCompetencies.filter((c) => !owned.some((o) => o.competencyId === c.id));

  async function upsert(competencyId: string, level: number) {
    setPendingId(competencyId);
    setError(null);
    try {
      const res = await fetch("/api/profile/competencies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencyId, level }),
      });
      if (!res.ok) {
        setError("Не удалось сохранить компетенцию.");
        return;
      }
      setSelection("");
      router.refresh();
    } catch {
      setError("Сервер недоступен.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(competencyId: string) {
    setPendingId(competencyId);
    setError(null);
    try {
      const res = await fetch(`/api/profile/competencies/${competencyId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Не удалось удалить компетенцию.");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {owned.length === 0 ? (
        <EmptyState title="Компетенции не указаны" description="Добавьте хотя бы одну, чтобы организаторы видели ваши сильные стороны." />
      ) : (
        <ul className="space-y-2">
          {owned.map((o) => (
            <li
              key={o.competencyId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{o.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{o.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`level-${o.competencyId}`}>
                  Уровень: {o.name}
                </label>
                <Select
                  id={`level-${o.competencyId}`}
                  value={o.level}
                  disabled={pendingId === o.competencyId}
                  onChange={(e) => upsert(o.competencyId, Number(e.target.value))}
                  className="w-auto"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      Уровень {l}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  aria-label={`Удалить компетенцию ${o.name}`}
                  onClick={() => remove(o.competencyId)}
                  disabled={pendingId === o.competencyId}
                  className="rounded-[8px] p-2 text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-[var(--color-danger)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-4">
          <div className="flex-1 min-w-48">
            <label htmlFor="add-competency" className="mb-1 block text-sm font-medium">
              Добавить компетенцию
            </label>
            <Select id="add-competency" value={selection} onChange={(e) => setSelection(e.target.value)}>
              <option value="">Выберите компетенцию</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category})
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!selection || pendingId !== null}
            onClick={() => selection && upsert(selection, 3)}
          >
            Добавить
          </Button>
        </div>
      )}
    </div>
  );
}
