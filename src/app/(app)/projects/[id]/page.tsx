import Link from "next/link";
import { notFound as notFoundPage } from "next/navigation";
import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { getProject, listProjectCompetencies } from "@/lib/db/repo/projects";
import { listApplications } from "@/lib/db/repo/applications";
import { getTeamByProject } from "@/lib/db/repo/teams";
import { canEditProject } from "@/lib/domain/authorization";
import { checkApplicationEligibility, describeEligibilityReason } from "@/lib/domain/eligibility";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AGE_GROUP_LABELS, APPLICATION_STATUS_LABELS, PROJECT_STATUS_LABELS } from "@/lib/format";
import { ApplyForm } from "./ApplyForm";
import { WithdrawButton } from "./WithdrawButton";
import { PrintButton } from "./PrintButton";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const project = await getProject(id);
  if (!project) notFoundPage();

  const competencies = await listProjectCompetencies(id);
  const team = await getTeamByProject(id);
  const actor = toActorContext(user);
  const editable = canEditProject(actor, project.organizer_id);

  let applicationSection = null;
  if (user.role_code === "participant") {
    const [myApplication] = await listApplications({ projectId: id, applicantId: user.id });
    if (myApplication && myApplication.status !== "withdrawn" && myApplication.status !== "rejected") {
      applicationSection = (
        <div className="space-y-2">
          <p className="text-sm">
            Статус вашей заявки:{" "}
            <Badge tone={myApplication.status === "approved" ? "success" : "warning"}>
              {APPLICATION_STATUS_LABELS[myApplication.status]}
            </Badge>
          </p>
          {myApplication.status === "pending" && <WithdrawButton applicationId={myApplication.id} />}
        </div>
      );
    } else {
      const eligibility = checkApplicationEligibility({
        project: { status: project.status, ageGroup: project.age_group, capacity: project.capacity },
        applicant: { ageGroup: user.age_group },
        hasActiveApplication: false,
        approvedMemberCount: project.member_count,
      });
      if (eligibility.eligible) {
        applicationSection = <ApplyForm projectId={id} />;
      } else {
        applicationSection = (
          <div className="rounded-[8px] bg-[var(--color-warning-soft)] px-3 py-2 text-sm text-[var(--color-warning)]">
            {myApplication?.status === "rejected" && "Ваша предыдущая заявка была отклонена. "}
            {eligibility.reasons.map(describeEligibilityReason).join(" ")}
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {project.direction} · {AGE_GROUP_LABELS[project.age_group]} · Организатор: {project.organizer_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Badge tone="accent">{PROJECT_STATUS_LABELS[project.status]}</Badge>
          <PrintButton />
          {editable && <LinkButton href={`/projects/${id}/edit`} variant="secondary">Редактировать</LinkButton>}
          {team && <LinkButton href={`/teams/${team.id}`} variant="secondary">Команда проекта</LinkButton>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Описание</h2>
        </CardHeader>
        <CardBody>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
            {project.description || "Описание пока не заполнено."}
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--color-text-muted)]">Мест в команде</dt>
              <dd className="font-medium">
                {project.member_count}/{project.capacity}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Смена</dt>
              <dd className="font-medium">{project.shift_name}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Открытых заявок</dt>
              <dd className="font-medium">{project.pending_applications}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Требуемые компетенции</h2>
        </CardHeader>
        <CardBody>
          {competencies.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Особых требований к компетенциям нет.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {competencies.map((c) => (
                <li key={c.competency_id}>
                  <Badge tone="neutral">
                    {c.name} · уровень {c.min_level}+
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {user.role_code === "participant" && (
        <Card className="print:hidden">
          <CardHeader>
            <h2 className="font-semibold">Участие</h2>
          </CardHeader>
          <CardBody>{applicationSection}</CardBody>
        </Card>
      )}

      <p className="text-xs text-[var(--color-text-muted)]">
        <Link href="/projects" className="hover:underline">
          ← Назад в каталог
        </Link>
      </p>
    </div>
  );
}
