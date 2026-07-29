function numeric(value) {
  return Number(value ?? 0);
}

export function calculateInfrastructureHealth({
  averageEquipmentHealth,
  faultEquipment,
  totalEquipment,
  offlineSensors,
  totalSensors,
  criticalAlerts,
}) {
  const equipmentBase =
    totalEquipment > 0 ? numeric(averageEquipmentHealth) : 100;
  const faultPenalty =
    totalEquipment > 0 ? (faultEquipment / totalEquipment) * 20 : 0;
  const offlinePenalty =
    totalSensors > 0 ? (offlineSensors / totalSensors) * 20 : 0;
  const criticalAlertPenalty = Math.min(criticalAlerts * 5, 20);
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        equipmentBase - faultPenalty - offlinePenalty - criticalAlertPenalty,
      ),
    ),
  );
}

export function createDashboardService({ repository, now = () => new Date() }) {
  return {
    async summary(context, input = {}) {
      const parsed = filterSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Filtrat e dashboard-it nuk janë të vlefshëm.",
        });
      }
      const queryContext = { ...context, ...parsed.data };
      const [raw, details] = await Promise.all([
        repository.summary(queryContext),
        repository.details(queryContext),
      ]);
      const metrics = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [key, numeric(value)]),
      );
      return {
        metrics: {
          laboratories: metrics.laboratories,
          activeEquipment: metrics.activeEquipment,
          faultEquipment: metrics.faultEquipment,
          onlineSensors: metrics.onlineSensors,
          activeAlerts: metrics.activeAlerts,
          currentPowerWatts: metrics.currentPowerWatts,
          currentOccupancy: metrics.currentOccupancy,
          plannedMaintenance: metrics.plannedMaintenance,
          infrastructureHealth: calculateInfrastructureHealth(metrics),
        },
        healthFactors: {
          averageEquipmentHealth: metrics.averageEquipmentHealth,
          faultEquipment: metrics.faultEquipment,
          totalEquipment: metrics.totalEquipment,
          offlineSensors: metrics.offlineSensors,
          totalSensors: metrics.totalSensors,
          criticalAlerts: metrics.criticalAlerts,
        },
        lastUpdatedAt: now().toISOString(),
        containsSimulatedData: metrics.simulatedReadingCount > 0,
        filters: {
          laboratoryId: parsed.data.laboratoryId
            ? String(parsed.data.laboratoryId)
            : null,
          hours: parsed.data.hours,
        },
        ...normalizeDetails(details),
      };
    },
  };
}

function normalizeDetails(details) {
  const numericFields = {
    latestSensorReadings: ["value"],
    laboratoryHealth: [
      "capacity",
      "equipmentHealth",
      "onlineSensors",
      "totalSensors",
      "activeAlerts",
    ],
    energyTrend: ["averagePowerWatts", "energyKwh", "containsSimulation"],
    equipmentStatus: ["total"],
    laboratories: ["capacity"],
  };
  return Object.fromEntries(
    Object.entries(details).map(([key, items]) => [
      key,
      items.map((item) => ({
        ...item,
        ...(numericFields[key] ?? []).reduce(
          (values, field) => ({
            ...values,
            [field]: numeric(item[field]),
          }),
          {},
        ),
        id: item.id === undefined ? undefined : String(item.id),
      })),
    ]),
  );
}
import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const filterSchema = z.object({
  laboratoryId: z.coerce.number().int().positive().optional(),
  hours: z.coerce
    .number()
    .pipe(z.union([z.literal(6), z.literal(24), z.literal(168)]))
    .default(24),
});
