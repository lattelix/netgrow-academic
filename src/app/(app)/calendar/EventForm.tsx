"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { EVENT_TYPE_LABELS } from "@/lib/format";
import type { EventType } from "@/lib/db/types";

interface TeamOption {
  id: string;
  name: string;
}

const EVENT_TYPES: EventType[] = ["training", "rehearsal", "meeting", "performance", "other"];

export function EventForm({ shiftId, teams }: { shiftId: string; teams: TeamOption[] }) {
  const router = useRouter();
  const [values, setValues] = useState({
    title: "",
    description: "",
    eventType: "meeting" as EventType,
    teamId: "",
    date: "",
    startTime: "10:00",
    endTime: "11:00",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const startsAt = new Date(`${values.date}T${values.startTime}:00`).toISOString();
      const endsAt = new Date(`${values.date}T${values.endTime}:00`).toISOString();
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          teamId: values.teamId || null,
          title: values.title,
          description: values.description,
          eventType: values.eventType,
          startsAt,
          endsAt,
          location: values.location,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось создать событие.");
        return;
      }
      setValues((v) => ({ ...v, title: "", description: "", location: "" }));
      router.refresh();
    } catch {
      setError("Сервер недоступен.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Форма нового события">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Название" htmlFor="event-title">
          <Input
            id="event-title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            required
            minLength={2}
          />
        </FormField>
        <FormField label="Тип события" htmlFor="event-type">
          <Select
            id="event-type"
            value={values.eventType}
            onChange={(e) => setValues((v) => ({ ...v, eventType: e.target.value as EventType }))}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Команда (необязательно)" htmlFor="event-team">
          <Select id="event-team" value={values.teamId} onChange={(e) => setValues((v) => ({ ...v, teamId: e.target.value }))}>
            <option value="">Общее событие смены</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Место проведения" htmlFor="event-location">
          <Input
            id="event-location"
            value={values.location}
            onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
          />
        </FormField>
        <FormField label="Дата" htmlFor="event-date">
          <Input
            id="event-date"
            type="date"
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Начало" htmlFor="event-start">
            <Input
              id="event-start"
              type="time"
              value={values.startTime}
              onChange={(e) => setValues((v) => ({ ...v, startTime: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Окончание" htmlFor="event-end">
            <Input
              id="event-end"
              type="time"
              value={values.endTime}
              onChange={(e) => setValues((v) => ({ ...v, endTime: e.target.value }))}
              required
            />
          </FormField>
        </div>
      </div>
      <FormField label="Описание" htmlFor="event-description">
        <Textarea
          id="event-description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Создание…" : "Добавить событие"}
      </Button>
    </form>
  );
}
