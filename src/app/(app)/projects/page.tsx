import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { listProjects, listDirections } from "@/lib/db/repo/projects";
import { listCompetencies } from "@/lib/db/repo/competencies";
import { canCreateProject } from "@/lib/domain/authorization";
import { toActorContext } from "@/lib/auth/session";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { EmptyState } from "@/components/ui/States";
import { Select, Input } from "@/components/ui/Field";
import { AGE_GROUP_LABELS, PROJECT_STATUS_LABELS } from "@/lib/format";
import type { ProjectAgeGroup, ProjectStatus } from "@/lib/db/types";

interface SearchParams {
  search?: string;
  direction?: string;
  ageGroup?: string;
  status?: string;
  competencyId?: string | string[];
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;

  const competencyIds = Array.isArray(sp.competencyId)
    ? sp.competencyId
    : sp.competencyId
      ? [sp.competencyId]
      : [];

  const projects = listProjects({
    search: sp.search || undefined,
    direction: sp.direction || undefined,
    ageGroup: (sp.ageGroup as ProjectAgeGroup) || undefined,
    status: (sp.status as ProjectStatus) || undefined,
    competencyIds: competencyIds.length ? competencyIds : undefined,
  });

  const directions = listDirections();
  const competencies = listCompetencies();
  const canCreate = canCreateProject(toActorContext(user));

  const hasFilters = Boolean(sp.search || sp.direction || sp.ageGroup || sp.status || competencyIds.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Каталог проектов</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Найдите проект по направлению, возрасту и нужным компетенциям.
          </p>
        </div>
        {canCreate && <LinkButton href="/projects/new">Новый проект</LinkButton>}
      </div>

      <Card>
        <CardBody>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Фильтры проектов">
            <div>
              <label htmlFor="search" className="mb-1 block text-sm font-medium">
                Поиск
              </label>
              <Input id="search" name="search" defaultValue={sp.search} placeholder="Название или описание" />
            </div>
            <div>
              <label htmlFor="direction" className="mb-1 block text-sm font-medium">
                Направление
              </label>
              <Select id="direction" name="direction" defaultValue={sp.direction ?? ""}>
                <option value="">Все направления</option>
                {directions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="ageGroup" className="mb-1 block text-sm font-medium">
                Возрастная группа
              </label>
              <Select id="ageGroup" name="ageGroup" defaultValue={sp.ageGroup ?? ""}>
                <option value="">Любая</option>
                {Object.entries(AGE_GROUP_LABELS)
                  .filter(([key]) => key !== "any")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium">
                Статус
              </label>
              <Select id="status" name="status" defaultValue={sp.status ?? ""}>
                <option value="">Любой статус</option>
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <fieldset className="sm:col-span-2 lg:col-span-4">
              <legend className="mb-1 text-sm font-medium">Компетенции</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {competencies.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="competencyId"
                      value={c.id}
                      defaultChecked={competencyIds.includes(c.id)}
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)]"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" variant="secondary">
                Применить фильтры
              </Button>
              {hasFilters && (
                <Link href="/projects" className="text-sm text-[var(--color-text-muted)] hover:underline">
                  Сбросить
                </Link>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {projects.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить параметры фильтра или сбросить их."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col">
                <CardBody className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-tight">
                      <Link href={`/projects/${p.id}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </h2>
                    <Badge tone="accent">{PROJECT_STATUS_LABELS[p.status]}</Badge>
                  </div>
                  <p className="line-clamp-3 flex-1 text-sm text-[var(--color-text-muted)]">{p.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <span>{p.direction}</span>
                    <span aria-hidden>·</span>
                    <span>{AGE_GROUP_LABELS[p.age_group]}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {p.member_count}/{p.capacity} мест
                    </span>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
