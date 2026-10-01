import { notFound, redirect } from "next/navigation";
import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canEditProject } from "@/lib/domain/authorization";
import { getProject, listProjectCompetencies } from "@/lib/db/repo/projects";
import { listShifts } from "@/lib/db/repo/shifts";
import { listCompetencies } from "@/lib/db/repo/competencies";
import { ForbiddenState } from "@/components/ui/States";
import { ProjectForm } from "../../ProjectForm";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = getProject(id);
  if (!project) notFound();

  if (!canEditProject(toActorContext(user), project.organizer_id)) {
    return <ForbiddenState description="Редактировать проект может только его организатор или администратор." />;
  }

  const shifts = listShifts();
  const competencies = listCompetencies();
  const projectCompetencies = listProjectCompetencies(id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Редактирование проекта</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{project.title}</p>
      </div>
      <ProjectForm
        mode="edit"
        projectId={id}
        shifts={shifts.map((s) => ({ id: s.id, name: s.name }))}
        competencyOptions={competencies.map((c) => ({ id: c.id, name: c.name, category: c.category }))}
        initial={{
          title: project.title,
          description: project.description,
          direction: project.direction,
          ageGroup: project.age_group,
          shiftId: project.shift_id,
          capacity: project.capacity,
          status: project.status,
          competencies: projectCompetencies.map((c) => ({ competencyId: c.competency_id, minLevel: c.min_level })),
        }}
      />
    </div>
  );
}
