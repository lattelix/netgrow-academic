import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { getTeam, listTeamMembers, isTeamMember } from "@/lib/db/repo/teams";
import { getProject } from "@/lib/db/repo/projects";
import { listTasksByTeam } from "@/lib/db/repo/tasks";
import { canCreateTask, canUpdateTask } from "@/lib/domain/authorization";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ForbiddenState } from "@/components/ui/States";
import { PROJECT_STATUS_LABELS, TASK_STATUS_LABELS, formatDate, initials } from "@/lib/format";
import { TaskForm } from "./TaskForm";
import { TaskStatusControl } from "./TaskStatusControl";

export default async function TeamWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const team = await getTeam(id);
  if (!team) notFound();

  const project = await getProject(team.project_id);
  if (!project) notFound();

  const actor = toActorContext(user);
  const isMember = await isTeamMember(id, user.id);
  const isManager = canCreateTask(actor, project.organizer_id);

  if (!isMember && !isManager) {
    return <ForbiddenState description="Просматривать рабочее пространство команды могут только её участники и организатор проекта." />;
  }

  const members = await listTeamMembers(id);
  const tasks = await listTasksByTeam(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{team.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            <Link href={`/projects/${project.id}`} className="hover:underline">
              {project.title}
            </Link>
          </p>
        </div>
        <Badge tone="accent">{PROJECT_STATUS_LABELS[project.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Участники ({members.length})</h2>
        </CardHeader>
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: m.avatar_color }}
                >
                  {initials(m.full_name)}
                </span>
                <div>
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {m.role_in_team === "lead" ? "Лидер команды" : "Участник"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Задачи</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {tasks.length === 0 ? (
            <EmptyState title="Задач пока нет" description="Организатор ещё не назначил задачи команде." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Задача
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Исполнитель
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Срок
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => {
                    const canChange = canUpdateTask(actor, project.organizer_id, t.assignee_id);
                    return (
                      <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-2 pr-3">
                          <p className="font-medium">{t.title}</p>
                          {t.description && (
                            <p className="text-xs text-[var(--color-text-muted)]">{t.description}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3">{t.assignee_name ?? "—"}</td>
                        <td className="py-2 pr-3">{t.due_date ? formatDate(t.due_date) : "—"}</td>
                        <td className="py-2">
                          {canChange ? (
                            <TaskStatusControl taskId={t.id} status={t.status} />
                          ) : (
                            <Badge tone={t.status === "done" ? "success" : t.status === "in_progress" ? "accent" : "neutral"}>
                              {TASK_STATUS_LABELS[t.status]}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {isManager && (
            <div className="border-t border-[var(--color-border)] pt-4">
              <h3 className="mb-3 text-sm font-semibold">Новая задача</h3>
              <TaskForm
                teamId={id}
                members={members.map((m) => ({ userId: m.user_id, fullName: m.full_name }))}
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
