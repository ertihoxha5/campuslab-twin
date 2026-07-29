import { z } from "zod";

export const laboratorySchema = z.object({
  name: z.string().trim().min(2, "Shkruani emrin e laboratorit."),
  code: z
    .string()
    .trim()
    .min(2, "Shkruani kodin e laboratorit.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Kodi mund të përmbajë vetëm shkronja, numra, - dhe _.",
    ),
  faculty: z.string().trim().min(2, "Shkruani fakultetin."),
  building: z.string().trim().min(1, "Shkruani ndërtesën."),
  floor: z.string().trim().min(1, "Shkruani katin."),
  capacity: z.coerce
    .number({ error: "Shkruani kapacitetin." })
    .int("Kapaciteti duhet të jetë numër i plotë.")
    .min(1, "Kapaciteti duhet të jetë së paku 1."),
  status: z.enum(["active", "inactive", "maintenance"]),
  responsibleUserId: z.string().optional(),
  description: z.string().trim().max(5000).optional(),
});

export const laboratoryDefaultValues = {
  name: "",
  code: "",
  faculty: "",
  building: "",
  floor: "",
  capacity: 20,
  status: "active",
  responsibleUserId: "",
  description: "",
};

export function laboratoryFormValues(laboratory) {
  return {
    ...laboratoryDefaultValues,
    ...Object.fromEntries(
      Object.entries(laboratory ?? {}).filter(([key]) =>
        Object.hasOwn(laboratoryDefaultValues, key),
      ),
    ),
  };
}
