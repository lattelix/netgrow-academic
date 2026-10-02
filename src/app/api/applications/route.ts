import { getCurrentUser, toActorContext } from "@/lib/auth/session";
import { canApplyToProject } from "@/lib/domain/authorization";
import { checkApplicationEligibility, describeEligibilityReason } from "@/lib/domain/eligibility";
import { badRequest, conflict, forbidden, notFound, ok, unauthorized } from "@/lib/api/respond";
import { createApplicationSchema } from "@/lib/validation/schemas";
import {
  createApplication,
  findActiveApplication,
  getApplication,
  listApplications,
  type ApplicationFilter,
  type ApplicationWithDetails,
} from "@/lib/db/repo/applications";
import { getProject } from "@/lib/db/repo/projects";
import { serializeApplication } from "@/lib/api/serialize";
import { logActivity } from "@/lib/db/repo/activityLog";
import { isUniqueViolation } from "@/lib/db/pgErrors";
import { withTransaction } from "@/lib/db/client";
import type { ApplicationRow, ApplicationStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope"); // "mine" | "queue"
  const filter: ApplicationFilter = {};

  if (user.role_code === "participant") {
    filter.applicantId = user.id;
  } else if (user.role_code === "organizer") {
    // Organizers must never be able to widen the query beyond their projects.
    filter.organizerId = user.id;
  } else if (scope === "mine") {
    filter.applicantId = user.id;
  }
  const status = searchParams.get("status") as ApplicationStatus | null;
  if (status) filter.status = status;
  const projectId = searchParams.get("projectId");
  if (projectId) filter.projectId = projectId;

  return ok((await listApplications(filter)).map(serializeApplication));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const actor = toActorContext(user);
  if (!canApplyToProject(actor)) return forbidden("Заявки может подавать только участник");

  const body = await request.json().catch(() => null);
  const parsed = createApplicationSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const project = await getProject(parsed.data.projectId);
  if (!project) return notFound("Проект не найден");

  const activeApplication = await findActiveApplication(project.id, user.id);
  const eligibility = checkApplicationEligibility({
    project: { status: project.status, ageGroup: project.age_group, capacity: project.capacity },
    applicant: { ageGroup: user.age_group },
    hasActiveApplication: Boolean(activeApplication),
    approvedMemberCount: project.member_count,
  });

  if (!eligibility.eligible) {
    return conflict("Заявку нельзя подать", {
      reasons: eligibility.reasons.map((r) => ({ code: r, message: describeEligibilityReason(r) })),
    });
  }

  let result: { application: ApplicationRow; withDetails: ApplicationWithDetails | undefined };
  try {
    result = await withTransaction(async () => {
      const application = await createApplication({
        projectId: project.id,
        applicantId: user.id,
        message: parsed.data.message,
      });
      await logActivity({
        actorId: user.id,
        action: "application.created",
        entityType: "application",
        entityId: application.id,
        metadata: { projectId: project.id },
      });
      const withDetails = await getApplication(application.id);
      return { application, withDetails };
    });
  } catch (err) {
    // The eligibility check above has a time-of-check/time-of-use gap under
    // concurrent double submission; the partial unique index is the real
    // guard. Letting the violation propagate out of withTransaction first
    // rolls back the failed insert (and any log write); only then do we turn
    // it into a controlled conflict response instead of a 500.
    if (isUniqueViolation(err)) {
      return conflict("Заявку нельзя подать", {
        reasons: [
          {
            code: "duplicate_active_application",
            message: describeEligibilityReason("duplicate_active_application"),
          },
        ],
      });
    }
    throw err;
  }

  return ok(result.withDetails ? serializeApplication(result.withDetails) : result.application, 201);
}
