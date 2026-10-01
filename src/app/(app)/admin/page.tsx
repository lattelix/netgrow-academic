import { redirect } from "next/navigation";
import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canManageReferenceData } from "@/lib/domain/authorization";
import { listShifts } from "@/lib/db/repo/shifts";
import { listCompetencies } from "@/lib/db/repo/competencies";
import { listUsers } from "@/lib/db/repo/users";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ForbiddenState } from "@/components/ui/States";
import { ShiftManager } from "./ShiftManager";
import { CompetencyManager } from "./CompetencyManager";
import { UserRoleManager } from "./UserRoleManager";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageReferenceData(toActorContext(user))) {
    return <ForbiddenState description="Раздел администрирования доступен только администратору." />;
  }

  const shifts = listShifts();
  const competencies = listCompetencies();
  const users = listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Администрирование</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Смены, справочник компетенций и роли пользователей.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Смены</h2>
        </CardHeader>
        <CardBody>
          <ShiftManager
            shifts={shifts.map((s) => ({
              id: s.id,
              name: s.name,
              code: s.code,
              startDate: s.start_date,
              endDate: s.end_date,
              status: s.status,
            }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Компетенции</h2>
        </CardHeader>
        <CardBody>
          <CompetencyManager competencies={competencies} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Пользователи и роли</h2>
        </CardHeader>
        <CardBody>
          <UserRoleManager
            users={users.map((u) => ({ id: u.id, fullName: u.full_name, email: u.email, roleCode: u.role_code }))}
            currentUserId={user.id}
          />
        </CardBody>
      </Card>
    </div>
  );
}
