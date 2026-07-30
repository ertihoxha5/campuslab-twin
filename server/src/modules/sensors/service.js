import { z } from "zod";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

export const sensorUnits = Object.freeze({
  temperature: "°C",
  humidity: "%",
  co2: "ppm",
  occupancy: "persona",
  smoke: "%",
  power: "W",
  voltage: "V",
  equipment_health: "%",
});

const sensorTypes = Object.keys(sensorUnits);
const statuses = ["online", "offline", "calibration", "inactive"];
const optionalId = z
  .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? String(value) : null));
const optionalNumber = z
  .union([z.coerce.number().finite(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));
const optionalDateTime = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform((value) =>
    value instanceof Date
      ? value.toISOString().slice(0, 23).replace("T", " ")
      : null,
  );

const listSchema = z.object({
  laboratoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((value) => (value ? String(value) : undefined)),
  sensorType: z.enum(sensorTypes).optional(),
  status: z.enum(statuses).optional(),
  search: z.string().trim().max(180).optional().default(""),
  sort: z
    .enum(["name", "code", "sensorType", "status", "updatedAt"])
    .default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const sensorSchema = z
  .object({
    laboratoryId: z.coerce.number().int().positive().transform(String),
    zoneId: optionalId,
    equipmentId: optionalId,
    name: z.string().trim().min(2).max(180),
    code: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((value) => value.toUpperCase()),
    sensorType: z.enum(sensorTypes),
    unit: z.string().trim().min(1).max(30),
    status: z.enum(statuses).default("online"),
    samplingIntervalSeconds: z.coerce.number().int().min(1).max(86400),
    warningMin: optionalNumber,
    warningMax: optionalNumber,
    criticalMin: optionalNumber,
    criticalMax: optionalNumber,
    calibratedAt: optionalDateTime,
    calibrationDueAt: optionalDateTime,
    positionX: z.coerce.number().finite().min(-100000).max(100000).default(0),
    positionY: z.coerce.number().finite().min(-100000).max(100000).default(0),
    positionZ: z.coerce.number().finite().min(-100000).max(100000).default(0),
    rotationX: z.coerce.number().finite().min(-360).max(360).default(0),
    rotationY: z.coerce.number().finite().min(-360).max(360).default(0),
    rotationZ: z.coerce.number().finite().min(-360).max(360).default(0),
  })
  .superRefine((sensor, context) => {
    if (sensor.unit !== sensorUnits[sensor.sensorType]) {
      context.addIssue({
        code: "custom",
        path: ["unit"],
        message: `Njësia për këtë lloj sensori duhet të jetë ${sensorUnits[sensor.sensorType]}.`,
      });
    }
    if (
      sensor.warningMin != null &&
      sensor.warningMax != null &&
      sensor.warningMin >= sensor.warningMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["warningMax"],
        message: "Pragu maksimal paralajmërues duhet të jetë më i madh.",
      });
    }
    if (
      sensor.criticalMin != null &&
      sensor.warningMin != null &&
      sensor.criticalMin >= sensor.warningMin
    ) {
      context.addIssue({
        code: "custom",
        path: ["criticalMin"],
        message:
          "Pragu minimal kritik duhet të jetë më i ulët se paralajmërimi.",
      });
    }
    if (
      sensor.criticalMax != null &&
      sensor.warningMax != null &&
      sensor.criticalMax <= sensor.warningMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["criticalMax"],
        message:
          "Pragu maksimal kritik duhet të jetë më i lartë se paralajmërimi.",
      });
    }
    if (
      sensor.calibratedAt &&
      sensor.calibrationDueAt &&
      sensor.calibrationDueAt <= sensor.calibratedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["calibrationDueAt"],
        message: "Kalibrimi i ardhshëm duhet të jetë pas kalibrimit të fundit.",
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
  if (result.invalidZone) {
    throw validationError("Zona nuk i përket laboratorit të zgjedhur.");
  }
  if (result.invalidEquipment) {
    throw validationError("Pajisja nuk i përket laboratorit të zgjedhur.");
  }
  return result;
}

export function createSensorService({ repository }) {
  return {
    async options(input = {}, context) {
      const laboratoryId = input.laboratoryId
        ? String(input.laboratoryId)
        : undefined;
      if (laboratoryId && !/^[1-9]\d*$/.test(laboratoryId)) {
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
        throw validationError("Filtrat e sensorëve nuk janë të vlefshëm.");
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

    async create(input, context) {
      const parsed = sensorSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(
          "Të dhënat e sensorit nuk janë të vlefshme.",
          parsed.error.issues,
        );
      }
      try {
        return validateRelations(
          await repository.create({
            universityId: context.universityId,
            userId: context.userId,
            restrictToAssignments: requiresLaboratoryAssignment(context),
            ipAddress: context.ipAddress,
            sensor: parsed.data,
          }),
        );
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
          throw new AppError({
            status: 409,
            code: "SENSOR_EXISTS",
            message: "Kodi i sensorit ekziston tashmë.",
          });
        }
        throw error;
      }
    },
  };
}
