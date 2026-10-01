"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import type { ProjectAgeGroup, ProjectStatus } from "@/lib/db/types";
import { AGE_GROUP_LABELS, PROJECT_STATUS_LABELS } from "@/lib/format";

interface ShiftOption {
  id: string;
  name: string;
}

interface CompetencyOption {
  id: string;
  name: string;
  category: string;
}

interface InitialCompetency {
  competencyId: string;
  minLevel: number;
}

interface Props {
  mode: "create" | "edit";
  projectId?: string;
  shifts: ShiftOption[];
  competencyOptions: CompetencyOption[];
  initial?: {
    title: string;
    description: string;
    direction: string;
    ageGroup: ProjectAgeGroup;
    shiftId: string;
    capacity: number;
    status: ProjectStatus;
    competencies: InitialCompetency[];
  };
}

const AGE_OPTIONS: ProjectAgeGroup[] = ["any", "9-11", "12-14", "15-17"];
const STATUS_OPTIONS: ProjectStatus[] = ["draft", "recruiting", "in_progress", "completed", "archived"];

export function ProjectForm({ mode, projectId, shifts, competencyOptions, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    direction: initial?.direction ?? "",
    ageGroup: initial?.ageGroup ?? ("any" as ProjectAgeGroup),
    shiftId: initial?.shiftId ?? shifts[0]?.id ?? "",
    capacity: initial?.capacity ?? 6,
    status: initial?.status ?? ("draft" as ProjectStatus),
  });
  const [competencyLevels, setCompetencyLevels] = useState<Record<string, number>>(
    Object.fromEntries((initial?.competencies ?? []).map((c) => [c.competencyId, c.minLevel]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCompetency(id: string, checked: boolean) {
    setCompetencyLevels((prev) => {
      const next = { ...prev };
      if (checked) next[id] = next[id] ?? 2;
      else delete next[id];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...values,
      capacity: Number(values.capacity),
      competencies: Object.entries(competencyLevels).map(([competencyId, minLevel]) => ({
        competencyId,
        minLevel,
      })),
    };

    try {
      const res = await fetch(mode === "create" ? "/api/projects" : `/api/projects/${projectId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось сохранить проект.");
        return;
      }
      router.push(`/projects/${data.id}`);
      router.refresh();
    } catch {
      setError("Сервер недоступен. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Форма проекта">
      <FormField label="Название" htmlFor="title">
        <Input
          id="title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          required
          minLength={3}
        />
      </FormField>
      <FormField label="Описание" htmlFor="description">
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Направление" htmlFor="direction">
          <Input
            id="direction"
            value={values.direction}
            onChange={(e) => setValues((v) => ({ ...v, direction: e.target.value }))}
            required
            minLength={2}
          />
        </FormField>
        <FormField label="Смена" htmlFor="shiftId">
          <Select
            id="shiftId"
            value={values.shiftId}
            onChange={(e) => setValues((v) => ({ ...v, shiftId: e.target.value }))}
            required
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Возрастная группа" htmlFor="ageGroup">
          <Select
            id="ageGroup"
            value={values.ageGroup}
            onChange={(e) => setValues((v) => ({ ...v, ageGroup: e.target.value as ProjectAgeGroup }))}
          >
            {AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {AGE_GROUP_LABELS[a]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Вместимость команды" htmlFor="capacity">
          <Input
            id="capacity"
            type="number"
            min={1}
            max={100}
            value={values.capacity}
            onChange={(e) => setValues((v) => ({ ...v, capacity: Number(e.target.value) }))}
            required
          />
        </FormField>
        <FormField label="Статус" htmlFor="status">
          <Select
            id="status"
            value={values.status}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as ProjectStatus }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Требуемые компетенции</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {competencyOptions.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-2 py-1.5">
              <input
                type="checkbox"
                id={`comp-${c.id}`}
                checked={c.id in competencyLevels}
                onChange={(e) => toggleCompetency(c.id, e.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)]"
              />
              <label htmlFor={`comp-${c.id}`} className="flex-1 text-sm">
                {c.name}
              </label>
              {c.id in competencyLevels && (
                <Select
                  aria-label={`Минимальный уровень: ${c.name}`}
                  value={competencyLevels[c.id]}
                  onChange={(e) =>
                    setCompetencyLevels((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                  }
                  className="w-auto"
                >
                  {[1, 2, 3, 4, 5].map((l) => (
                    <option key={l} value={l}>
                      Уровень {l}+
                    </option>
                  ))}
                </Select>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Сохранение…" : mode === "create" ? "Создать проект" : "Сохранить изменения"}
      </Button>
    </form>
  );
}
