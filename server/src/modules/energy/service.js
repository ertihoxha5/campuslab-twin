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
const settingsSchema = z.object({
  tariffPerKwh: z.coerce.number().min(0).max(1000),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
});

const number = (value) => Number(value ?? 0);

function recommendations({
  totalEnergyKwh,
  changePercent,
  peakPowerWatts,
  averagePowerWatts,
  largestConsumers,
}) {
  if (totalEnergyKwh === 0) {
    return [
      "Nuk ka ende të dhëna të mjaftueshme për rekomandime energjetike.",
    ];
  }
  const items = [];
  if (changePercent !== null && changePercent > 10) {
    items.push(
      `Konsumi është rritur ${changePercent.toFixed(1)}% ndaj periudhës paraprake; kontrolloni oraret dhe pajisjet që mbeten aktive pa nevojë.`,
    );
  }
  if (averagePowerWatts > 0 && peakPowerWatts > averagePowerWatts * 1.5) {
    items.push(
      "Kulmi i fuqisë është dukshëm mbi mesataren; shpërndani ndezjen e pajisjeve me konsum të lartë në orare të ndryshme.",
    );
  }
  const largest = largestConsumers[0];
  if (largest?.sharePercent >= 30) {
    items.push(
      `${largest.equipmentName} përbën ${largest.sharePercent.toFixed(1)}% të konsumit; verifikoni parametrat, mirëmbajtjen dhe orarin e përdorimit.`,
    );
  }
  if (items.length === 0) {
    items.push(
      "Konsumi është relativisht i qëndrueshëm; vazhdoni monitorimin dhe fikni pajisjet jashtë orarit të punës.",
    );
  }
  return items;
}

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
      const [raw, storedSettings] = await Promise.all([
        repository.overview({
          universityId: context.universityId,
          userId: context.userId,
          restrictToAssignments: requiresLaboratoryAssignment(context),
          ...parsed.data,
          startAt,
          endAt,
          previousStartAt,
        }),
        repository.getSettings({ universityId: context.universityId }),
      ]);

      const totalEnergyKwh = number(raw.summary?.totalEnergyKwh);
      const previousEnergyKwh = number(raw.previous?.totalEnergyKwh);
      const changePercent =
        previousEnergyKwh > 0
          ? ((totalEnergyKwh - previousEnergyKwh) / previousEnergyKwh) * 100
          : null;
      const tariffPerKwh = number(storedSettings?.tariffPerKwh ?? 0.12);
      const currencyCode = storedSettings?.currencyCode ?? "EUR";
      const peakPowerWatts = number(raw.summary?.peakPowerWatts);
      const averagePowerWatts = number(raw.summary?.averagePowerWatts);
      const largestConsumers = raw.largestConsumers.map((item) => ({
        ...item,
        equipmentId: String(item.equipmentId),
        laboratoryId: String(item.laboratoryId),
        energyKwh: number(item.energyKwh),
        sharePercent:
          totalEnergyKwh > 0
            ? Number(((number(item.energyKwh) / totalEnergyKwh) * 100).toFixed(2))
            : 0,
      }));
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
          peakPowerWatts,
          averagePowerWatts,
          previousEnergyKwh,
          changePercent:
            changePercent === null ? null : Number(changePercent.toFixed(2)),
          estimatedCost: Number((totalEnergyKwh * tariffPerKwh).toFixed(2)),
          previousEstimatedCost: Number(
            (previousEnergyKwh * tariffPerKwh).toFixed(2),
          ),
          tariffPerKwh,
          currencyCode,
        },
        trend: raw.trend.map((point) => ({
          ...point,
          energyKwh: number(point.energyKwh),
          averagePowerWatts: number(point.averagePowerWatts),
          peakPowerWatts: number(point.peakPowerWatts),
        })),
        largestConsumers,
        provenance: raw.provenance.map((item) => ({
          ...item,
          energyKwh: number(item.energyKwh),
          samples: number(item.samples),
        })),
        recommendations: recommendations({
          totalEnergyKwh,
          changePercent,
          peakPowerWatts,
          averagePowerWatts,
          largestConsumers,
        }),
      };
    },

    async settings(context) {
      const settings = await repository.getSettings({
        universityId: context.universityId,
      });
      return {
        tariffPerKwh: number(settings?.tariffPerKwh ?? 0.12),
        currencyCode: settings?.currencyCode ?? "EUR",
        updatedAt: settings?.updatedAt ?? null,
      };
    },

    async updateSettings(input, context) {
      const parsed = settingsSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Tarifa ose valuta nuk është e vlefshme.",
        });
      }
      return repository.updateSettings({
        universityId: context.universityId,
        userId: context.userId,
        ipAddress: context.ipAddress,
        settings: parsed.data,
      });
    },
  };
}
