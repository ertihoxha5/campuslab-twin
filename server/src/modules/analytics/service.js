import { z } from "zod";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

const metrics = [
  "temperature",
  "humidity",
  "co2",
  "occupancy",
  "smoke",
  "power",
  "equipment_health",
  "alerts",
  "maintenance",
];
const filterSchema = z.object({
  metric: z.enum(metrics),
  interval: z.enum(["hourly", "daily", "weekly", "monthly"]).default("daily"),
  laboratoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((value) => (value ? String(value) : undefined)),
  assetId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((value) => (value ? String(value) : undefined)),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
});

export function createAnalyticsService({ repository, maximumRangeDays = 366 }) {
  return {
    async history(input, context) {
      const parsed = filterSchema.safeParse(input);
      if (!parsed.success) throw validationError();
      const startAt = new Date(parsed.data.startAt);
      const endAt = new Date(parsed.data.endAt);
      const rangeMs = endAt.getTime() - startAt.getTime();
      if (rangeMs <= 0 || rangeMs > maximumRangeDays * 86_400_000) {
        throw validationError(
          "Periudha duhet të jetë pozitive dhe jo më e gjatë se 366 ditë.",
        );
      }
      const result = await repository.history({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
        ...parsed.data,
        startAt,
        endAt,
      });
      return {
        filters: {
          ...parsed.data,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
        summary: normalizeSummary(result.summary),
        series: result.series.map((point) => ({
          ...point,
          value: Number(point.value ?? 0),
          minimum: point.minimum == null ? null : Number(point.minimum),
          maximum: point.maximum == null ? null : Number(point.maximum),
          samples: Number(point.samples ?? 0),
        })),
        provenance: result.provenance.map((item) => ({
          ...item,
          samples: Number(item.samples ?? 0),
        })),
      };
    },
  };
}

function normalizeSummary(summary = {}) {
  return {
    value: Number(summary.value ?? 0),
    minimum: summary.minimum == null ? null : Number(summary.minimum),
    maximum: summary.maximum == null ? null : Number(summary.maximum),
    samples: Number(summary.samples ?? 0),
  };
}

function validationError(
  message = "Filtrat e analitikës nuk janë të vlefshëm.",
) {
  return new AppError({ status: 422, code: "VALIDATION_ERROR", message });
}
