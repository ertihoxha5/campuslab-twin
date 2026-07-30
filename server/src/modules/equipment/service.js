import { z } from "zod";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

const statuses = ["active", "inactive", "fault", "maintenance"];
const optionalId = z
  .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? String(value) : null));
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);
const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);

const listSchema = z.object({
  laboratoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((value) => (value ? String(value) : undefined)),
  status: z.enum(statuses).optional(),
  search: z.string().trim().max(180).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  laboratoryId: z.coerce.number().int().positive().transform(String),
  zoneId: optionalId,
  responsibleUserId: optionalId,
  name: z.string().trim().min(2).max(180),
  code: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  type: z.string().trim().min(2).max(100),
  manufacturer: optionalText(120),
  model: optionalText(120),
  serialNumber: optionalText(120),
  status: z.enum(statuses).optional().default("active"),
  purchaseDate: optionalDate,
  warrantyExpiresAt: optionalDate,
  energyRatingWatts: z.coerce
    .number()
    .min(0)
    .max(1000000000)
    .nullable()
    .optional(),
  healthScore: z.coerce.number().min(0).max(100).default(100),
  object3dReference: optionalText(255),
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

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Pajisja e kërkuar nuk u gjet.",
  });

const validId = (value) => /^[1-9]\d*$/.test(String(value));

function validateRelationResult(result) {
  if (result.invalidLaboratory) {
    throw validationError("Laboratori nuk është i qasshëm.");
  }
  if (result.invalidZone) {
    throw validationError(
      "Zona nuk i përket laboratorit dhe universitetit të zgjedhur.",
    );
  }
  if (result.invalidResponsibleUser) {
    throw validationError(
      "Përdoruesi përgjegjës nuk është aktiv në universitetin tuaj.",
    );
  }
  return result;
}

function rethrowConflict(error) {
  if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
    throw new AppError({
      status: 409,
      code: "EQUIPMENT_EXISTS",
      message: "Kodi ose numri serik i pajisjes ekziston tashmë.",
    });
  }
  throw error;
}

export function createEquipmentService({ repository }) {
  return {
    async options(input = {}, context) {
      const laboratoryId = input.laboratoryId
        ? String(input.laboratoryId)
        : undefined;
      if (laboratoryId && !validId(laboratoryId)) {
        throw validationError("Laboratori i zgjedhur nuk është i vlefshëm.");
      }
      return repository.options({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
        laboratoryId,
      });
    },

    async list(input = {}, context) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError("Filtrat e pajisjeve nuk janë të vlefshëm.");
      }
      const { page, pageSize, ...filters } = parsed.data;
      const result = await repository.list({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
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

    async detail(equipmentId, context) {
      if (!validId(equipmentId)) throw notFound();
      const equipment = await repository.findById({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
        equipmentId,
      });
      if (!equipment) throw notFound();
      return equipment;
    },

    async create(input, context) {
      const parsed = createSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          "Të dhënat e pajisjes nuk janë të vlefshme.",
          parsed.error.issues,
        );
      }
      try {
        const result = await repository.create({
          universityId: context.universityId,
          userId: context.userId,
          restrictToAssignments: requiresLaboratoryAssignment(context),
          ipAddress: context.ipAddress,
          equipment: parsed.data,
        });
        return validateRelationResult(result);
      } catch (error) {
        rethrowConflict(error);
      }
    },

    async update(equipmentId, input, context) {
      if (!validId(equipmentId)) throw notFound();
      const parsed = createSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          "Të dhënat e pajisjes nuk janë të vlefshme.",
          parsed.error.issues,
        );
      }
      try {
        const result = await repository.update({
          universityId: context.universityId,
          userId: context.userId,
          restrictToAssignments: requiresLaboratoryAssignment(context),
          equipmentId,
          ipAddress: context.ipAddress,
          equipment: parsed.data,
        });
        if (!result) throw notFound();
        return validateRelationResult(result);
      } catch (error) {
        rethrowConflict(error);
      }
    },

    async archive(equipmentId, context) {
      if (!validId(equipmentId)) throw notFound();
      const equipment = await repository.archive({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
        equipmentId,
        ipAddress: context.ipAddress,
      });
      if (!equipment) throw notFound();
      return equipment;
    },
  };
}
