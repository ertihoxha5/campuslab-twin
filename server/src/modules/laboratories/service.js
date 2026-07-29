import { z } from "zod";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

const statuses = ["active", "inactive", "maintenance"];

const listSchema = z.object({
  search: z.string().trim().max(180).optional().default(""),
  status: z.enum(statuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(180),
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  faculty: z.string().trim().min(2).max(180),
  building: z.string().trim().min(1).max(160),
  floor: z.string().trim().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(65535),
  responsibleUserId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? String(value) : null)),
  description: z.string().trim().max(5000).optional().default(""),
  status: z.enum(statuses).optional().default("active"),
});

const updateSchema = createSchema;

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Laboratori i kërkuar nuk u gjet.",
  });

const validId = (value) => /^[1-9]\d*$/.test(String(value));

const rethrowConflict = (error) => {
  if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
    throw new AppError({
      status: 409,
      code: "LABORATORY_CODE_EXISTS",
      message: "Një laborator me këtë kod ekziston tashmë.",
    });
  }
  throw error;
};

const validationError = (message, issues) =>
  new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message,
    details: issues
      ? issues.reduce((details, issue) => {
          const field = String(issue.path[0] ?? "form");
          details[field] = [...(details[field] ?? []), issue.message];
          return details;
        }, {})
      : undefined,
  });

export function createLaboratoryService({ repository }) {
  return {
    async listResponsibleUsers(context) {
      const users = await repository.listResponsibleUsers({
        universityId: context.universityId,
      });
      return users.map((user) => ({
        ...user,
        roles: user.roleCodes ? user.roleCodes.split(",") : [],
        roleCodes: undefined,
      }));
    },

    async list(input = {}, context) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError("Filtrat e laboratorëve nuk janë të vlefshëm.");
      }
      const { search, status, page, pageSize } = parsed.data;
      const result = await repository.list({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
        search,
        status,
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

    async listArchived(input = {}, context) {
      const parsed = listSchema.omit({ status: true }).safeParse(input);
      if (!parsed.success) {
        throw validationError("Filtrat e arkivit nuk janë të vlefshëm.");
      }
      const { search, page, pageSize } = parsed.data;
      const result = await repository.list({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: false,
        search,
        archivedOnly: true,
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
          "Të dhënat e laboratorit nuk janë të vlefshme.",
          parsed.error.issues,
        );
      }

      try {
        const result = await repository.create({
          universityId: context.universityId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          laboratory: parsed.data,
        });
        if (result.invalidResponsibleUser) {
          throw validationError(
            "Përgjegjësi duhet të jetë administrator ose menaxher aktiv i laboratorit në universitetin tuaj.",
          );
        }
        return result;
      } catch (error) {
        rethrowConflict(error);
      }
    },

    async detail(laboratoryId, context) {
      if (!validId(laboratoryId)) throw notFound();
      const laboratory = await repository.findById({
        universityId: context.universityId,
        laboratoryId,
      });
      if (!laboratory) throw notFound();
      return laboratory;
    },

    async update(laboratoryId, input, context) {
      if (!validId(laboratoryId)) throw notFound();
      const parsed = updateSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          "Të dhënat e laboratorit nuk janë të vlefshme.",
          parsed.error.issues,
        );
      }
      try {
        const result = await repository.update({
          universityId: context.universityId,
          laboratoryId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          laboratory: parsed.data,
        });
        if (!result) throw notFound();
        if (result.invalidResponsibleUser) {
          throw validationError(
            "Përgjegjësi duhet të jetë administrator ose menaxher aktiv i laboratorit në universitetin tuaj.",
          );
        }
        return result;
      } catch (error) {
        rethrowConflict(error);
      }
    },

    async archive(laboratoryId, context) {
      if (!validId(laboratoryId)) throw notFound();
      const laboratory = await repository.archive({
        universityId: context.universityId,
        laboratoryId,
        userId: context.userId,
        ipAddress: context.ipAddress,
      });
      if (!laboratory) throw notFound();
      return laboratory;
    },

    async restore(laboratoryId, context) {
      if (!validId(laboratoryId)) throw notFound();
      const laboratory = await repository.restore({
        universityId: context.universityId,
        laboratoryId,
        userId: context.userId,
        ipAddress: context.ipAddress,
      });
      if (!laboratory) throw notFound();
      return laboratory;
    },
  };
}
