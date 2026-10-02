import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { listEventsForUser } from "@/lib/db/repo/events";
import { listShifts } from "@/lib/db/repo/shifts";
import { listTeamsForOrganizer, listAllTeams } from "@/lib/db/repo/teams";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { EVENT_TYPE_LABELS, formatDate, formatTime } from "@/lib/format";
import { EventForm } from "./EventForm";
import type { EventWithTeam } from "@/lib/db/repo/events";

function groupByDate(events: EventWithTeam[]) {
  const groups = new Map<string, EventWithTeam[]>();
  for (const e of events) {
    const key = e.starts_at.slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const shifts = await listShifts();
  const activeShift = shifts.find((s) => s.status === "active") ?? shifts[0];
  // Role-scoped for every role (participant/organizer/admin); the active
  // shift only narrows the result, it is never used to widen access via the
  // unrestricted listEventsByShift.
  const events = await listEventsForUser(toActorContext(user), activeShift?.id);

  const grouped = groupByDate(events);
  const canCreate = user.role_code === "organizer" || user.role_code === "admin";
  const teams =
    user.role_code === "organizer"
      ? await listTeamsForOrganizer(user.id)
      : user.role_code === "admin"
        ? await listAllTeams()
        : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Календарь смены</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {activeShift ? activeShift.name : "Смена не выбрана"}
        </p>
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="Событий не запланировано" description="Как только появятся события, они отобразятся здесь." />
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dayEvents]) => (
            <Card key={date}>
              <CardHeader>
                <h2 className="font-semibold">{formatDate(dayEvents[0].starts_at)}</h2>
              </CardHeader>
              <CardBody>
                <ul className="divide-y divide-[var(--color-border)]">
                  {dayEvents.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div>
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatTime(e.starts_at)}–{formatTime(e.ends_at)}
                          {e.location ? ` · ${e.location}` : ""}
                          {e.team_name ? ` · ${e.team_name}` : ""}
                        </p>
                      </div>
                      <Badge tone="neutral">{EVENT_TYPE_LABELS[e.event_type]}</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {canCreate && activeShift && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Новое событие</h2>
          </CardHeader>
          <CardBody>
            <EventForm shiftId={activeShift.id} teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
