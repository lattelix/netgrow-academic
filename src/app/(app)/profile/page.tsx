import { getCurrentUser } from "@/lib/auth/session";
import { listUserCompetencies, listCompetencies } from "@/lib/db/repo/competencies";
import { getShift } from "@/lib/db/repo/shifts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/lib/format";
import { ProfileForm } from "./ProfileForm";
import { CompetencyEditor } from "./CompetencyEditor";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const owned = listUserCompetencies(user.id);
  const shift = user.shift_id ? getShift(user.shift_id) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Профиль</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {ROLE_LABELS[user.role_code]}
          {shift ? ` · ${shift.name}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Основные данные</h2>
        </CardHeader>
        <CardBody>
          <ProfileForm fullName={user.full_name} bio={user.bio} ageGroup={user.age_group} />
        </CardBody>
      </Card>

      {user.role_code === "participant" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Компетенции</h2>
          </CardHeader>
          <CardBody>
            <CompetencyEditor
              allCompetencies={listCompetencies().map((c) => ({ id: c.id, name: c.name, category: c.category }))}
              owned={owned.map((o) => ({
                competencyId: o.competency_id,
                name: o.name,
                category: o.category,
                level: o.level,
              }))}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
