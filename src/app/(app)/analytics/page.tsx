import { redirect } from "next/navigation";
import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/domain/authorization";
import { getAnalyticsSummary } from "@/lib/db/repo/analytics";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ForbiddenState } from "@/components/ui/States";
import {
  APPLICATION_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/format";
import type { ApplicationStatus, ProjectStatus, TaskStatus } from "@/lib/db/types";

function Bar({ label, value, total, tone = "accent" }: { label: string; value: number; total: number; tone?: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-[var(--color-text-muted)]">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: tone === "accent" ? "var(--color-accent)" : "#94a3b8" }}
        />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewAnalytics(toActorContext(user))) {
    return <ForbiddenState description="Аналитика доступна организаторам и администратору." />;
  }

  const summary = getAnalyticsSummary();
  const totalProjects = summary.totalProjects || 1;
  const totalApplications = summary.applicationsByStatus.reduce((s, a) => s + a.count, 0) || 1;
  const totalTasks = summary.tasksByStatus.reduce((s, a) => s + a.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Аналитика</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Операционные показатели проектной деятельности смены.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-text-muted)]">Участники</p>
            <p className="mt-1 text-2xl font-semibold">{summary.totalParticipants}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-text-muted)]">Организаторы</p>
            <p className="mt-1 text-2xl font-semibold">{summary.totalOrganizers}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-text-muted)]">Средняя заполненность команд</p>
            <p className="mt-1 text-2xl font-semibold">{Math.round(summary.averageTeamFillRate * 100)}%</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--color-text-muted)]">Среднее время решения по заявке</p>
            <p className="mt-1 text-2xl font-semibold">
              {summary.averageDecisionHours !== null ? `${Math.round(summary.averageDecisionHours)} ч` : "—"}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Проекты по статусу</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {summary.projectsByStatus.map((s) => (
              <Bar
                key={s.status}
                label={PROJECT_STATUS_LABELS[s.status as ProjectStatus]}
                value={s.count}
                total={totalProjects}
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Заявки по статусу</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {summary.applicationsByStatus.map((s) => (
              <Bar
                key={s.status}
                label={APPLICATION_STATUS_LABELS[s.status as ApplicationStatus]}
                value={s.count}
                total={totalApplications}
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Задачи по статусу</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {summary.tasksByStatus.map((s) => (
              <Bar key={s.status} label={TASK_STATUS_LABELS[s.status as TaskStatus]} value={s.count} total={totalTasks} />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Проекты по направлениям</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {summary.directionBreakdown.map((d) => (
              <Bar key={d.direction} label={d.direction} value={d.projectCount} total={totalProjects} tone="muted" />
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
