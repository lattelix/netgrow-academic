"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import type { AgeGroup } from "@/lib/db/types";

interface Props {
  fullName: string;
  bio: string;
  ageGroup: AgeGroup | null;
}

const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "9-11", label: "9–11 лет" },
  { value: "12-14", label: "12–14 лет" },
  { value: "15-17", label: "15–17 лет" },
];

export function ProfileForm({ fullName, bio, ageGroup }: Props) {
  const router = useRouter();
  const [values, setValues] = useState({ fullName, bio, ageGroup: ageGroup ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          bio: values.bio,
          ageGroup: values.ageGroup || null,
        }),
      });
      if (!res.ok) {
        setError("Не удалось сохранить профиль.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Сервер недоступен.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Форма редактирования профиля">
      <FormField label="Имя и фамилия" htmlFor="fullName">
        <Input
          id="fullName"
          value={values.fullName}
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          required
          minLength={2}
        />
      </FormField>
      <FormField label="Возрастная группа" htmlFor="ageGroup">
        <Select
          id="ageGroup"
          value={values.ageGroup}
          onChange={(e) => setValues((v) => ({ ...v, ageGroup: e.target.value as AgeGroup | "" }))}
        >
          <option value="">Не указана</option>
          {AGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="О себе" htmlFor="bio">
        <Textarea
          id="bio"
          value={values.bio}
          onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
          maxLength={1000}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
        {saved && <span className="text-sm text-[var(--color-success)]">Сохранено</span>}
      </div>
    </form>
  );
}
