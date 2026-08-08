import { z } from "zod";

export const scenarioDefinitions = Object.freeze({
  temperature_rise: {
    label: "Rritje e shpejtë e temperaturës",
    eventType: "temperature_rise",
    defaultIntensity: 1,
  },
  ventilation_failure: {
    label: "Dështim i ventilimit dhe rritje e CO₂",
    eventType: "ventilation_failure",
    defaultIntensity: 1,
  },
  equipment_failure: {
    label: "Dështim i pajisjes",
    eventType: "equipment_failure",
    defaultIntensity: 1,
  },
  sensor_offline: {
    label: "Sensor jashtë linje",
    eventType: "sensor_offline",
    defaultIntensity: 1,
  },
  overcapacity: {
    label: "Kapacitet i tejkaluar",
    eventType: "overcapacity",
    defaultIntensity: 1,
  },
  smoke_incident: {
    label: "Incident tymi dhe sigurie",
    eventType: "smoke_incident",
    defaultIntensity: 1,
  },
  power_spike: {
    label: "Rritje e menjëhershme e fuqisë",
    eventType: "power_spike",
    defaultIntensity: 1,
  },
  energy_saving: {
    label: "Ndërhyrje për kursim të energjisë",
    eventType: "energy_saving",
    defaultIntensity: 1,
  },
});

const overrideSchema = z
  .object({
    intensity: z.coerce.number().min(0.1).max(3).default(1),
    startTick: z.coerce.number().int().min(1).max(1000).default(3),
    durationTicks: z.coerce.number().int().min(1).max(1000).default(8),
    previewTicks: z.coerce.number().int().min(1).max(60).default(12),
    baselineOccupancy: z.coerce.number().int().min(0).max(500).optional(),
    equipmentLoad: z.coerce.number().min(0).max(1).optional(),
    targetSensorId: z.coerce
      .number()
      .int()
      .positive()
      .transform(String)
      .optional(),
  })
  .strict();

export function buildScenarioConfiguration({
  scenarioType,
  storedConfiguration = {},
  overrides = {},
}) {
  const definition = scenarioDefinitions[scenarioType];
  if (!definition) return { invalidScenarioType: true };
  const parsed = overrideSchema.safeParse(overrides);
  if (!parsed.success) return { validationError: parsed.error };
  const values = parsed.data;
  const configuration = {
    ...storedConfiguration,
    ...(values.baselineOccupancy === undefined
      ? {}
      : { baselineOccupancy: values.baselineOccupancy }),
    ...(values.equipmentLoad === undefined
      ? {}
      : { equipmentLoad: values.equipmentLoad }),
    abnormalEvent: {
      type: definition.eventType,
      intensity: values.intensity ?? definition.defaultIntensity,
      startTick: values.startTick,
      durationTicks: values.durationTicks,
      ...(values.targetSensorId
        ? { targetSensorId: values.targetSensorId }
        : {}),
    },
  };
  return {
    scenarioType,
    label: definition.label,
    previewTicks: values.previewTicks,
    configuration,
  };
}
