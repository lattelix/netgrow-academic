import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { listApplications } from "@/lib/db/repo/applications";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ForbiddenState } from "@/components/ui/States";
import { APPLICATION_STATUS_LABELS, formatDateTime } from "@/lib/format";
import { ApplicationDecision } from "./ApplicationDecision";
import type { ApplicationStatus } from "@/lib/db/types";

export default async function OrganizerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const actor = toActorContext(user);
  if (actor.role === "participant") {
    return <ForbiddenState description="Очередь заявок доступна организаторам и администратору." />;
  }

  const sp = await searchParams;
  const status = (sp.status as ApplicationStatus | undefined) ?? "pending";

  const applications = listApplications({
    organizerId: actor.role === "organizer" ? user.id : undefined,
    status,
  });

  const tabs: { value: ApplicationStatus | "all"; label: string }[] = [
    { value: "pending", label: "На рассмотрении" },
    { value: "approved", label: "Одобренные" },
    { value: "rejected", label: "Отклонённые" },
    { value: "withdrawn", label: "Отозванные" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Заявки на проекты</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {actor.role === "admin" ? "Все заявки в системе." : "Заявки на ваши проекты."}
        </p>
      </div>

      <nav aria-label="Фильтр по статусу заявки" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/organizer/applications?status=${t.value}`}
            className={`rounded-[8px] px-3 py-1.5 text-sm font-medium ${
              status === t.value
                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]"
                : "text-[var(--color-text-muted)] hover:bg-slate-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <EmptyState title="Заявок нет" description="В этой категории пока нет заявок." />
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => (
            <li key={a.id}>
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {a.applicant_name}{" "}
                      <span className="font-normal text-[var(--color-text-muted)]">→ {a.project_title}</span>
                    </p>
                    {a.message && <p className="mt-1 text-sm text-[var(--color-text-muted)]">«{a.message}»</p>}
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Подана {formatDateTime(a.created_at)}
                    </p>
                  </div>
                  {a.status === "pending" ? (
                    <ApplicationDecision applicationId={a.id} />
                  ) : (
                    <Badge tone={a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "neutral"}>
                      {APPLICATION_STATUS_LABELS[a.status]}
                    </Badge>
                  )}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
