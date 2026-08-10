import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const defaults = Object.freeze({
  temperatureMinC: 18,
  temperatureMaxC: 28,
  humidityMinPercent: 30,
  humidityMaxPercent: 70,
  co2MaxPpm: 1000,
  smokeMaxPercent: 1,
  maintenanceReminderDays: 3,
  notifyAlerts: true,
  notifyMaintenance: true,
  notifyEnergy: true,
  notifySimulations: true,
  simulationDurationMinutes: 15,
  simulationTickSeconds: 5,
});
const schema = z
  .object({
    temperatureMinC: z.coerce.number().min(-50).max(100),
    temperatureMaxC: z.coerce.number().min(-50).max(100),
    humidityMinPercent: z.coerce.number().min(0).max(100),
    humidityMaxPercent: z.coerce.number().min(0).max(100),
    co2MaxPpm: z.coerce.number().int().min(300).max(10000),
    smokeMaxPercent: z.coerce.number().min(0).max(100),
    maintenanceReminderDays: z.coerce.number().int().min(0).max(365),
    notifyAlerts: z.boolean(),
    notifyMaintenance: z.boolean(),
    notifyEnergy: z.boolean(),
    notifySimulations: z.boolean(),
    simulationDurationMinutes: z.coerce.number().int().min(1).max(1440),
    simulationTickSeconds: z.coerce.number().int().min(1).max(300),
  })
  .refine((value) => value.temperatureMinC < value.temperatureMaxC, {
    path: ["temperatureMaxC"],
    message: "Maksimumi duhet të jetë mbi minimumin.",
  })
  .refine((value) => value.humidityMinPercent < value.humidityMaxPercent, {
    path: ["humidityMaxPercent"],
    message: "Maksimumi duhet të jetë mbi minimumin.",
  });

export function createUniversitySettingsService({ repository }) {
  return {
    async get(context) {
      return normalize(
        (await repository.get(context.universityId)) ?? defaults,
      );
    },
    async update(input, context) {
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Preferencat e universitetit nuk janë të vlefshme.",
          details: Object.fromEntries(
            parsed.error.issues.map((issue) => [
              String(issue.path[0] ?? "form"),
              [issue.message],
            ]),
          ),
        });
      }
      return normalize(
        await repository.update({
          ...parsed.data,
          universityId: context.universityId,
          userId: context.userId,
          ipAddress: context.ipAddress,
        }),
      );
    },
  };
}

function normalize(settings) {
  return {
    temperatureMinC: Number(settings.temperatureMinC),
    temperatureMaxC: Number(settings.temperatureMaxC),
    humidityMinPercent: Number(settings.humidityMinPercent),
    humidityMaxPercent: Number(settings.humidityMaxPercent),
    co2MaxPpm: Number(settings.co2MaxPpm),
    smokeMaxPercent: Number(settings.smokeMaxPercent),
    maintenanceReminderDays: Number(settings.maintenanceReminderDays),
    notifyAlerts: Boolean(settings.notifyAlerts),
    notifyMaintenance: Boolean(settings.notifyMaintenance),
    notifyEnergy: Boolean(settings.notifyEnergy),
    notifySimulations: Boolean(settings.notifySimulations),
    simulationDurationMinutes: Number(settings.simulationDurationMinutes),
    simulationTickSeconds: Number(settings.simulationTickSeconds),
    updatedAt: settings.updatedAt ?? null,
  };
}
