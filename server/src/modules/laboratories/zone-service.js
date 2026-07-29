import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const vectorSchema = z.object({
  x: z.coerce.number().finite(),
  y: z.coerce.number().finite(),
  z: z.coerce.number().finite(),
});

const dimensionsSchema = z.object({
  width: z.coerce.number().positive().max(1000),
  height: z.coerce.number().positive().max(1000),
  depth: z.coerce.number().positive().max(1000),
});

const rangeSchema = z
  .object({
    min: z.coerce.number().finite(),
    max: z.coerce.number().finite(),
  })
  .refine(({ min, max }) => min < max, {
    message: "Vlera minimale duhet të jetë më e vogël se maksimalja.",
  });

const zoneSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  zoneType: z
    .enum([
      "general",
      "teaching",
      "research",
      "preparation",
      "storage",
      "safety",
    ])
    .default("general"),
  description: z.string().trim().max(5000).optional().default(""),
  occupancyLimit: z
    .union([z.coerce.number().int().positive().max(65535), z.null()])
    .optional()
    .default(null),
  position: vectorSchema,
  dimensions: dimensionsSchema,
  environmentalThresholds: z
    .object({
      temperature: rangeSchema.optional(),
      humidity: rangeSchema.optional(),
      co2: rangeSchema.optional(),
    })
    .optional()
    .nullable()
    .default(null),
});

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Zona e kërkuar nuk u gjet.",
  });

const validId = (value) => /^[1-9]\d*$/.test(String(value));

const validationError = (issues) =>
  new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message: "Të dhënat e zonës nuk janë të vlefshme.",
    details: issues.reduce((details, issue) => {
      const field = String(issue.path[0] ?? "form");
      details[field] = [...(details[field] ?? []), issue.message];
      return details;
    }, {}),
  });

const conflictError = (error) => {
  if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
    throw new AppError({
      status: 409,
      code: "ZONE_CODE_EXISTS",
      message: "Një zonë me këtë kod ekziston tashmë në laborator.",
    });
  }
  if (error?.code === "ER_ROW_IS_REFERENCED_2" || error?.errno === 1451) {
    throw new AppError({
      status: 409,
      code: "ZONE_IN_USE",
      message:
        "Zona nuk mund të fshihet sepse ka pajisje ose sensorë të lidhur.",
    });
  }
  throw error;
};

export function createLaboratoryZoneService({ repository }) {
  return {
    async list(laboratoryId, context) {
      return repository.list({
        universityId: context.universityId,
        laboratoryId,
      });
    },

    async create(laboratoryId, input, context) {
      const parsed = zoneSchema.safeParse(input);
      if (!parsed.success) throw validationError(parsed.error.issues);
      try {
        return await repository.create({
          universityId: context.universityId,
          laboratoryId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          zone: parsed.data,
        });
      } catch (error) {
        conflictError(error);
      }
    },

    async update(laboratoryId, zoneId, input, context) {
      if (!validId(zoneId)) throw notFound();
      const parsed = zoneSchema.safeParse(input);
      if (!parsed.success) throw validationError(parsed.error.issues);
      try {
        const zone = await repository.update({
          universityId: context.universityId,
          laboratoryId,
          zoneId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          zone: parsed.data,
        });
        if (!zone) throw notFound();
        return zone;
      } catch (error) {
        conflictError(error);
      }
    },

    async remove(laboratoryId, zoneId, context) {
      if (!validId(zoneId)) throw notFound();
      try {
        const zone = await repository.remove({
          universityId: context.universityId,
          laboratoryId,
          zoneId,
          userId: context.userId,
          ipAddress: context.ipAddress,
        });
        if (!zone) throw notFound();
        return zone;
      } catch (error) {
        conflictError(error);
      }
    },
  };
}
