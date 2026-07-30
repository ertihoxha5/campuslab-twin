import { z } from "zod";

const optionalNumber = (maximum, message) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(0, message).max(maximum, message).optional(),
  );

export const equipmentSchema = z.object({
  laboratoryId: z.string().min(1, "Zgjidhni laboratorin."),
  zoneId: z.string().optional(),
  responsibleUserId: z.string().optional(),
  name: z.string().trim().min(2, "Shkruani emrin e pajisjes."),
  code: z
    .string()
    .trim()
    .min(2, "Shkruani kodin e pajisjes.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Kodi mund të përmbajë vetëm shkronja, numra, - dhe _.",
    ),
  type: z.string().trim().min(2, "Shkruani llojin e pajisjes."),
  manufacturer: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "fault", "maintenance"]),
  purchaseDate: z.string().optional(),
  warrantyExpiresAt: z.string().optional(),
  energyRatingWatts: optionalNumber(
    1000000000,
    "Fuqia duhet të jetë numër pozitiv.",
  ),
  healthScore: z.coerce
    .number()
    .min(0, "Shëndeti duhet të jetë ndërmjet 0 dhe 100.")
    .max(100, "Shëndeti duhet të jetë ndërmjet 0 dhe 100."),
  object3dReference: z.string().trim().optional(),
});

export const equipmentDefaultValues = {
  laboratoryId: "",
  zoneId: "",
  responsibleUserId: "",
  name: "",
  code: "",
  type: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  status: "active",
  purchaseDate: "",
  warrantyExpiresAt: "",
  energyRatingWatts: "",
  healthScore: 100,
  object3dReference: "",
};

export function equipmentFormValues(equipment) {
  const values = {
    ...equipmentDefaultValues,
    ...Object.fromEntries(
      Object.entries(equipment ?? {}).filter(([key]) =>
        Object.hasOwn(equipmentDefaultValues, key),
      ),
    ),
  };
  values.laboratoryId = String(values.laboratoryId ?? "");
  values.zoneId = String(values.zoneId ?? "");
  values.responsibleUserId = String(values.responsibleUserId ?? "");
  values.purchaseDate = normalizeDate(values.purchaseDate);
  values.warrantyExpiresAt = normalizeDate(values.warrantyExpiresAt);
  values.energyRatingWatts = values.energyRatingWatts ?? "";
  return values;
}

function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : "";
}
