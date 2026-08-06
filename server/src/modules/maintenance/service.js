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
  };
}
