import { z } from "zod";

export const ageGroupSchema = z.enum(["9-11", "12-14", "15-17"]);
export const projectAgeGroupSchema = z.enum(["9-11", "12-14", "15-17", "any"]);
export const projectStatusSchema = z.enum([
  "draft",
  "recruiting",
  "in_progress",
  "completed",
  "archived",
]);
export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const eventTypeSchema = z.enum([
  "training",
  "rehearsal",
  "meeting",
  "performance",
  "other",
]);
export const roleCodeSchema = z.enum(["participant", "organizer", "admin"]);

export const createApplicationSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().max(1000).optional().default(""),
});

export const decideApplicationSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decisionNote: z.string().max(1000).optional().default(""),
});

export const createProjectSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).default(""),
  direction: z.string().trim().min(2).max(80),
  ageGroup: projectAgeGroupSchema,
  shiftId: z.string().min(1),
  capacity: z.number().int().min(1).max(100),
  status: projectStatusSchema.optional(),
  competencies: z
    .array(
      z.object({
        competencyId: z.string().min(1),
        minLevel: z.number().int().min(1).max(5),
      })
    )
    .default([]),
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  direction: z.string().trim().min(2).max(80).optional(),
  ageGroup: projectAgeGroupSchema.optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  status: projectStatusSchema.optional(),
  competencies: z
    .array(
      z.object({
        competencyId: z.string().min(1),
        minLevel: z.number().int().min(1).max(5),
      })
    )
    .optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  assigneeId: z.string().min(1).nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  status: taskStatusSchema.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  status: taskStatusSchema.optional(),
});

export const upsertUserCompetencySchema = z.object({
  competencyId: z.string().min(1),
  level: z.number().int().min(1).max(5),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  ageGroup: ageGroupSchema.nullable().optional(),
});

export const createCompetencySchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(""),
});

export const updateCompetencySchema = createCompetencySchema.partial();

export const createShiftSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(40),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

export const updateShiftSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  status: z.enum(["planned", "active", "completed"]).optional(),
});

export const createEventSchema = z.object({
  shiftId: z.string().min(1),
  teamId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  eventType: eventTypeSchema.optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  location: z.string().trim().max(160).optional().default(""),
});

export const updateUserRoleSchema = z.object({
  roleCode: roleCodeSchema,
});

export const loginSchema = z.object({
  userId: z.string().min(1),
});
