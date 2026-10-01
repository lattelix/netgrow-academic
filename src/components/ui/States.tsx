import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Lock, Loader2 } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[8px] border border-dashed border-[var(--color-border)] bg-white px-6 py-10 text-center">
      <Inbox className="h-8 w-8 text-slate-400" aria-hidden />
      <p className="font-medium text-[var(--color-text)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Не удалось загрузить данные",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-[8px] border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-6 py-10 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" aria-hidden />
      <p className="font-medium text-[var(--color-danger)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>}
    </div>
  );
}

export function ForbiddenState({
  description = "У вашей роли нет доступа к этому разделу.",
}: {
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-white px-6 py-10 text-center">
      <Lock className="h-8 w-8 text-slate-400" aria-hidden />
      <p className="font-medium text-[var(--color-text)]">Доступ запрещён</p>
      <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

export function LoadingState({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-text-muted)]" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}
