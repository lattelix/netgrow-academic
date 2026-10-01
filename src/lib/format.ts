import type {
  ApplicationStatus,
  EventType,
  ProjectAgeGroup,
  ProjectStatus,
  RoleCode,
  ShiftStatus,
  TaskStatus,
} from "@/lib/db/types";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export const ROLE_LABELS: Record<RoleCode, string> = {
  participant: "Участник",
  organizer: "Организатор",
  admin: "Администратор",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Черновик",
  recruiting: "Набор участников",
  in_progress: "В работе",
  completed: "Завершён",
  archived: "В архиве",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
  withdrawn: "Отозвана",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export const AGE_GROUP_LABELS: Record<ProjectAgeGroup, string> = {
  "9-11": "9–11 лет",
  "12-14": "12–14 лет",
  "15-17": "15–17 лет",
  any: "Любой возраст",
};

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  planned: "Запланирована",
  active: "Идёт сейчас",
  completed: "Завершена",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Обучение",
  rehearsal: "Репетиция",
  meeting: "Встреча",
  performance: "Выступление",
  other: "Другое",
};

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
