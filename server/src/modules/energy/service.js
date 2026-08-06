import { z } from "zod";

import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

const intervalConfiguration = {
  hourly: { durationMs: 24 * 60 * 60 * 1000 },
  daily: { durationMs: 30 * 24 * 60 * 60 * 1000 },
  weekly: { durationMs: 12 * 7 * 24 * 60 * 60 * 1000 },
  monthly: { durationMs: 365 * 24 * 60 * 60 * 1000 },
};
const filterSchema = z.object({
  interval: z.enum(["hourly", "daily", "weekly", "monthly"]).default("hourly"),
  laboratoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((value) => (value ? String(value) : undefined)),
  equipmentId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((value) => (value ? String(value) : undefined)),
});

const number = (value) => Number(value ?? 0);

export function createEnergyService({ repository, now = () => new Date() }) {
  return {
    async overview(input = {}, context) {
      const parsed = filterSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Filtrat e energjisë nuk janë të vlefshëm.",
        });
      }
      const endAt = now();
      const durationMs = intervalConfiguration[parsed.data.interval].durationMs;
      const startAt = new Date(endAt.getTime() - durationMs);
      const previousStartAt = new Date(startAt.getTime() - durationMs);
      const raw = await repository.overview({
        universityId: context.universityId,
        userId: context.userId,
        restrictToAssignments: requiresLaboratoryAssignment(context),
        ...parsed.data,
        startAt,
        endAt,
        previousStartAt,
      });

      const totalEnergyKwh = number(raw.summary?.totalEnergyKwh);
      const previousEnergyKwh = number(raw.previous?.totalEnergyKwh);
      const changePercent =
        previousEnergyKwh > 0
          ? ((totalEnergyKwh - previousEnergyKwh) / previousEnergyKwh) * 100
          : null;
      return {
        filters: {
          ...parsed.data,
          laboratoryId: parsed.data.laboratoryId ?? null,
          equipmentId: parsed.data.equipmentId ?? null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
        current: {
          powerWatts: number(raw.current?.powerWatts),
          recordedAt: raw.current?.recordedAt ?? null,
        },
        summary: {
          totalEnergyKwh,
          peakPowerWatts: number(raw.summary?.peakPowerWatts),
          averagePowerWatts: number(raw.summary?.averagePowerWatts),
          previousEnergyKwh,
          changePercent:
            changePercent === null ? null : Number(changePercent.toFixed(2)),
        },
        trend: raw.trend.map((point) => ({
          ...point,
          energyKwh: number(point.energyKwh),
          averagePowerWatts: number(point.averagePowerWatts),
          peakPowerWatts: number(point.peakPowerWatts),
        })),
        largestConsumers: raw.largestConsumers.map((item) => ({
          ...item,
          equipmentId: String(item.equipmentId),
          laboratoryId: String(item.laboratoryId),
          energyKwh: number(item.energyKwh),
          sharePercent:
            totalEnergyKwh > 0
              ? Number(((number(item.energyKwh) / totalEnergyKwh) * 100).toFixed(2))
              : 0,
        })),
        provenance: raw.provenance.map((item) => ({
          ...item,
          energyKwh: number(item.energyKwh),
          samples: number(item.samples),
        })),
      };
    },
  };
}
