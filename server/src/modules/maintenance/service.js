import { z } from "zod";

import { permissions } from "../../authorization/permissions.js";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

const types = ["preventive", "corrective", "inspection", "calibration"];
const priorities = ["low", "medium", "high", "critical"];
const statuses = ["planned", "in_progress", "waiting", "completed", "cancelled"];

const optionalId = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .transform((value) => (value ? String(value) : undefined));
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);
const optionalDateTime = z
  .union([z.string().datetime({ offset: true }), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? new Date(value) : null));

const listSchema = z.object({
  laboratoryId: optionalId,
  equipmentId: optionalId,
  assignedUserId: optionalId,
  type: z.enum(types).optional(),
  priority: z.enum(priorities).optional(),
  status: z.enum(statuses).optional(),
  search: z.string().trim().max(180).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const checklistItemSchema = z.object({
  label: z.string().trim().min(1).max(240),
  completed: z.boolean().optional().default(false),
});

const createSchema = z
  .object({
    laboratoryId: z.coerce.number().int().positive().transform(String),
    equipmentId: z.coerce.number().int().positive().transform(String),
    assignedUserId: z
      .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
      .optional()
      .transform((value) => (value ? String(value) : null)),
    type: z.enum(types),
    priority: z.enum(priorities).optional().default("medium"),
    title: z.string().trim().min(3).max(180),
    description: optionalText(4000),
    checklist: z.array(checklistItemSchema).max(50).optional().default([]),
    scheduledAt: optionalDateTime,
    dueAt: optionalDateTime,
    notes: optionalText(2000),
  })
  .superRefine((value, context) => {
    if (value.scheduledAt && value.dueAt && value.dueAt < value.scheduledAt) {
      context.addIssue({
        code: "custom",
        path: ["dueAt"],
        message: "Afati duhet të jetë pas datës së planifikuar.",
      });
    }
  });

const transitionSchema = z.object({
  status: z.enum(["in_progress", "waiting", "completed", "cancelled"]),
  notes: z.string().trim().min(2).max(2000),
  checklist: z.array(checklistItemSchema).max(50).optional(),
  repairDetails: optionalText(4000),
  cost: z.coerce
    .number()
    .min(0)
    .max(1000000000)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
});

const allowedTransitions = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["waiting", "completed", "cancelled"],
  waiting: ["in_progress", "cancelled"],
};

const validationError = (message, issues) =>
  new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message,
    details: issues
      ? Object.fromEntries(
          issues.map((issue) => [
            String(issue.path[0] ?? "form"),
            [issue.message],
          ]),
        )
      : undefined,
  });

function validateRelations(result) {
  if (result.invalidLaboratory) {
    throw validationError("Laboratori nuk është i qasshëm.");
  }
  if (result.invalidEquipment) {
    throw validationError("Pajisja nuk i përket laboratorit të zgjedhur.");
  }
  if (result.invalidAssignee) {
    throw validationError(
      "Tekniku i zgjedhur nuk është aktiv ose nuk i përket universitetit.",
    );
  }
  return result;
}

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Detyra e mirëmbajtjes nuk u gjet.",
  });

const validId = (value) => /^[1-9]\d*$/.test(String(value));

export function createMaintenanceService({ repository }) {
  const access = (context) => ({
    universityId: context.universityId,
    userId: context.userId,
    restrictToAssignments: requiresLaboratoryAssignment(context),
    restrictToAssignedWork: !context.permissions.includes(
      permissions.MAINTENANCE_MANAGE,
    ),
  });

  return {
    async list(input = {}, context) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError("Filtrat e mirëmbajtjes nuk janë të vlefshëm.");
      }
      const { page, pageSize, ...filters } = parsed.data;
      const result = await repository.list({
        ...access(context),
        ...filters,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      return {
        items: result.items,
        pagination: {
          page,
          pageSize,
          total: result.total,
          pages: Math.ceil(result.total / pageSize),
        },
      };
    },

    async create(input, context) {
      const parsed = createSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          "Të dhënat e detyrës së mirëmbajtjes nuk janë të vlefshme.",
          parsed.error.issues,
        );
      }
      return validateRelations(
        await repository.create({
          ...access(context),
          ipAddress: context.ipAddress,
          task: parsed.data,
        }),
      );
    },

    async detail(taskId, context) {
      if (!validId(taskId)) throw notFound();
      const task = await repository.findById({
        ...access(context),
        taskId: String(taskId),
      });
      if (!task) throw notFound();
      const [history, evidence] = await Promise.all([
        repository.history({
          universityId: context.universityId,
          taskId: String(taskId),
        }),
        repository.listEvidence({
          ...access(context),
          taskId: String(taskId),
        }),
      ]);
      return {
        ...task,
        history,
        evidence: evidence ?? [],
      };
    },

    async transition(taskId, input, context) {
      if (!validId(taskId)) throw notFound();
      const parsed = transitionSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          "Përditësimi i mirëmbajtjes nuk është i vlefshëm.",
          parsed.error.issues,
        );
      }
      const current = await repository.findById({
        ...access(context),
        taskId: String(taskId),
      });
      if (!current) throw notFound();
      if (!allowedTransitions[current.status]?.includes(parsed.data.status)) {
        throw new AppError({
          status: 409,
          code: "INVALID_MAINTENANCE_TRANSITION",
          message: "Ky ndryshim i statusit të mirëmbajtjes nuk lejohet.",
        });
      }
      const storedChecklist = Array.isArray(current.checklist)
        ? current.checklist
        : JSON.parse(current.checklist || "[]");
      const checklist = parsed.data.checklist ?? storedChecklist;
      if (
        parsed.data.status === "completed" &&
        checklist.some((item) => !item.completed)
      ) {
        throw validationError(
          "Të gjithë hapat e checklist-it duhet të përfundohen.",
        );
      }
      if (
        parsed.data.status === "completed" &&
        current.type === "corrective" &&
        !parsed.data.repairDetails
      ) {
        throw validationError(
          "Detajet e riparimit janë të detyrueshme për mirëmbajtjen korrigjuese.",
        );
      }
      const result = await repository.transition({
        ...access(context),
        taskId: String(taskId),
        ipAddress: context.ipAddress,
        update: { ...parsed.data, checklist },
      });
      if (!result) throw notFound();
      if (result.invalidTransition) {
        throw new AppError({
          status: 409,
          code: "INVALID_MAINTENANCE_TRANSITION",
          message: "Statusi ndryshoi. Rifreskojeni dhe provoni përsëri.",
        });
      }
      return result;
    },
  };
}
