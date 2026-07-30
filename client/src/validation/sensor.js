import { z } from "zod";

export const sensorTypes = {
  temperature: { label: "Temperaturë", unit: "°C" },
  humidity: { label: "Lagështi", unit: "%" },
  co2: { label: "CO₂", unit: "ppm" },
  occupancy: { label: "Prani", unit: "persona" },
  smoke: { label: "Tym", unit: "%" },
  power: { label: "Fuqi", unit: "W" },
  voltage: { label: "Tension", unit: "V" },
  equipment_health: { label: "Shëndet pajisjeje", unit: "%" },
};

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite("Shkruani një numër të vlefshëm.").optional(),
);

export const sensorSchema = z
  .object({
    laboratoryId: z.string().min(1, "Zgjidhni laboratorin."),
    zoneId: z.string().optional(),
    equipmentId: z.string().optional(),
    name: z.string().trim().min(2, "Shkruani emrin e sensorit."),
    code: z
      .string()
      .trim()
      .min(2, "Shkruani kodin e sensorit.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Kodi mund të përmbajë vetëm shkronja, numra, - dhe _.",
      ),
    sensorType: z.enum(Object.keys(sensorTypes)),
    unit: z.string().min(1),
    status: z.enum(["online", "offline", "calibration", "inactive"]),
    samplingIntervalSeconds: z.coerce
      .number()
      .int("Intervali duhet të jetë numër i plotë.")
      .min(1, "Intervali minimal është 1 sekondë.")
      .max(86400, "Intervali maksimal është 86400 sekonda."),
    warningMin: optionalNumber,
    warningMax: optionalNumber,
    criticalMin: optionalNumber,
    criticalMax: optionalNumber,
    calibratedAt: z.string().optional(),
    calibrationDueAt: z.string().optional(),
    positionX: z.coerce.number().finite(),
    positionY: z.coerce.number().finite(),
    positionZ: z.coerce.number().finite(),
    rotationX: z.coerce.number().min(-360).max(360),
    rotationY: z.coerce.number().min(-360).max(360),
    rotationZ: z.coerce.number().min(-360).max(360),
  })
  .superRefine((sensor, context) => {
    if (sensor.unit !== sensorTypes[sensor.sensorType].unit) {
      addIssue(context, "unit", "Njësia nuk përputhet me llojin e sensorit.");
    }
    if (
      sensor.warningMin != null &&
      sensor.warningMax != null &&
      sensor.warningMin >= sensor.warningMax
    ) {
      addIssue(
        context,
        "warningMax",
        "Pragu maksimal duhet të jetë më i madh.",
      );
    }
    if (
      sensor.criticalMin != null &&
      sensor.warningMin != null &&
      sensor.criticalMin >= sensor.warningMin
    ) {
      addIssue(
        context,
        "criticalMin",
        "Pragu kritik duhet të jetë më i ulët se paralajmërimi.",
      );
    }
    if (
      sensor.criticalMax != null &&
      sensor.warningMax != null &&
      sensor.criticalMax <= sensor.warningMax
    ) {
      addIssue(
        context,
        "criticalMax",
        "Pragu kritik duhet të jetë më i lartë se paralajmërimi.",
      );
    }
    if (
      sensor.calibratedAt &&
      sensor.calibrationDueAt &&
      sensor.calibrationDueAt <= sensor.calibratedAt
    ) {
      addIssue(
        context,
        "calibrationDueAt",
        "Kalibrimi i ardhshëm duhet të jetë pas kalibrimit të fundit.",
      );
    }
  });

export const sensorDefaultValues = {
  laboratoryId: "",
  zoneId: "",
  equipmentId: "",
  name: "",
  code: "",
  sensorType: "temperature",
  unit: "°C",
  status: "online",
  samplingIntervalSeconds: 60,
  warningMin: "",
  warningMax: "",
  criticalMin: "",
  criticalMax: "",
  calibratedAt: "",
  calibrationDueAt: "",
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
};

function addIssue(context, path, message) {
  context.addIssue({ code: "custom", path: [path], message });
}
