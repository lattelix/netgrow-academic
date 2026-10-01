import { redirect } from "next/navigation";
import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canCreateProject } from "@/lib/domain/authorization";
import { listShifts } from "@/lib/db/repo/shifts";
import { listCompetencies } from "@/lib/db/repo/competencies";
import { ForbiddenState } from "@/components/ui/States";
import { ProjectForm } from "../ProjectForm";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!canCreateProject(toActorContext(user))) {
    return <ForbiddenState description="Создавать проекты может организатор или администратор." />;
  }

  const shifts = await listShifts();
  const competencies = await listCompetencies();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Новый проект</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Заполните карточку проекта, чтобы начать набор команды.</p>
      </div>
      <ProjectForm
        mode="create"
        shifts={shifts.map((s) => ({ id: s.id, name: s.name }))}
        competencyOptions={competencies.map((c) => ({ id: c.id, name: c.name, category: c.category }))}
      />
    </div>
  );
}
