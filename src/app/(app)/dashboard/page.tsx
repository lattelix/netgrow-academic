import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { listApplications } from "@/lib/db/repo/applications";
import { listTasksByAssignee } from "@/lib/db/repo/tasks";
import { listEventsForUser } from "@/lib/db/repo/events";
import { listTeamsForUser } from "@/lib/db/repo/teams";
import { listProjects } from "@/lib/db/repo/projects";
import { getAnalyticsSummary } from "@/lib/db/repo/analytics";
import { listRecentActivity } from "@/lib/db/repo/activityLog";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import {
  APPLICATION_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  formatDateTime,
} from "@/lib/format";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
      </CardBody>
    </Card>
  );
}

async function ParticipantDashboard({ userId }: { userId: string }) {
  const applications = listApplications({ applicantId: userId });
  const tasks = listTasksByAssignee(userId);
  const events = listEventsForUser(userId).filter((e) => new Date(e.starts_at) >= new Date()).slice(0, 3);
  const teams = listTeamsForUser(userId);

  const activeApplications = applications.filter((a) => a.status === "pending" || a.status === "approved");
  const openTasks = tasks.filter((t) => t.status !== "done");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Активные заявки" value={activeApplications.length} />
        <StatCard label="Команды" value={teams.length} />
        <StatCard label="Открытые задачи" value={openTasks.length} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Мои заявки</h2>
          <Link href="/projects" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
            Каталог проектов
          </Link>
        </CardHeader>
        <CardBody>
          {applications.length === 0 ? (
            <EmptyState
              title="Заявок пока нет"
              description="Найдите проект в каталоге и подайте заявку на участие."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {applications.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/projects/${a.project_id}`} className="text-sm font-medium hover:underline">
                    {a.project_title}
                  </Link>
                  <Badge
                    tone={
                      a.status === "approved"
                        ? "success"
                        : a.status === "rejected"
                          ? "danger"
                          : a.status === "withdrawn"
                            ? "neutral"
                            : "warning"
                    }
                  >
                    {APPLICATION_STATUS_LABELS[a.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Мои задачи</h2>
          </CardHeader>
          <CardBody>
            {tasks.length === 0 ? (
              <EmptyState title="Задач нет" description="Задачи появятся после того, как вас включат в команду." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {tasks.slice(0, 5).map((t) => (
                  <li key={t.id} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/teams/${t.team_id}`} className="text-sm font-medium hover:underline">
                        {t.title}
                      </Link>
                      <Badge tone={t.status === "done" ? "success" : t.status === "in_progress" ? "accent" : "neutral"}>
                        {TASK_STATUS_LABELS[t.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">{t.project_title}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Ближайшие события</h2>
            <Link href="/calendar" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
              Календарь
            </Link>
          </CardHeader>
          <CardBody>
            {events.length === 0 ? (
              <EmptyState title="Событий не запланировано" />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {events.map((e) => (
                  <li key={e.id} className="py-2">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDateTime(e.starts_at)} · {e.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

async function OrganizerDashboard({ userId }: { userId: string }) {
  const projects = listProjects({ organizerId: userId });
  const pending = listApplications({ organizerId: userId, status: "pending" });
  const activity = listRecentActivity(6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Мои проекты" value={projects.length} />
        <StatCard label="Заявок на рассмотрении" value={pending.length} />
        <StatCard
          label="Заполненность команд"
          value={
            projects.length === 0
              ? "—"
              : `${Math.round(
                  (projects.reduce((sum, p) => sum + Math.min(1, p.member_count / p.capacity), 0) /
                    projects.length) *
                    100
                )}%`
          }
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Мои проекты</h2>
          <Link href="/projects/new" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
            Новый проект
          </Link>
        </CardHeader>
        <CardBody>
          {projects.length === 0 ? (
            <EmptyState title="Проектов пока нет" description="Создайте первый проект для набора команды." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/projects/${p.id}`} className="text-sm font-medium hover:underline">
                    {p.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {p.member_count}/{p.capacity}
                    </span>
                    <Badge tone="accent">{PROJECT_STATUS_LABELS[p.status]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Последние действия</h2>
        </CardHeader>
        <CardBody>
          {activity.length === 0 ? (
            <EmptyState title="Действий пока нет" />
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="text-[var(--color-text-muted)]">
                  <span className="font-medium text-[var(--color-text)]">{a.actor_name ?? "Система"}</span> —{" "}
                  {a.action} · {formatDateTime(a.created_at)}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

async function AdminDashboard() {
  const summary = getAnalyticsSummary();
  const activity = listRecentActivity(6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Участники" value={summary.totalParticipants} />
        <StatCard label="Организаторы" value={summary.totalOrganizers} />
        <StatCard label="Проекты" value={summary.totalProjects} />
        <StatCard label="Команды" value={summary.totalTeams} />
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Последние действия в системе</h2>
          <Link href="/analytics" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
            Вся аналитика
          </Link>
        </CardHeader>
        <CardBody>
          {activity.length === 0 ? (
            <EmptyState title="Активности пока нет" />
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="text-[var(--color-text-muted)]">
                  <span className="font-medium text-[var(--color-text)]">{a.actor_name ?? "Система"}</span> —{" "}
                  {a.action} · {formatDateTime(a.created_at)}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Здравствуйте, {user.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {user.role_code === "participant" && "Ваши заявки, команды и ближайшие события."}
          {user.role_code === "organizer" && "Сводка по вашим проектам и заявкам."}
          {user.role_code === "admin" && "Общая сводка по информационной системе."}
        </p>
      </div>
      {user.role_code === "participant" && <ParticipantDashboard userId={user.id} />}
      {user.role_code === "organizer" && <OrganizerDashboard userId={user.id} />}
      {user.role_code === "admin" && <AdminDashboard />}
    </div>
  );
}
