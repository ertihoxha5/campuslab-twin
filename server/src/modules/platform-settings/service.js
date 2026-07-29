import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const settingsSchema = z.object({
  registrationsOpen: z.boolean(),
  requireWebsiteDomainMatch: z.boolean(),
  allowPublicEmailProviders: z.boolean(),
});

const domain = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(190)
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/);
const exceptionSchema = z.object({
  emailDomain: domain,
  websiteDomain: z
    .union([domain, z.literal("")])
    .transform((value) => value || null),
  reason: z.string().trim().min(3).max(500),
});

const validationError = (message) =>
  new AppError({ status: 422, code: "VALIDATION_ERROR", message });

export function createPlatformSettingsService({ repository }) {
  return {
    get: () => repository.get(),
    async update(input, context) {
      const parsed = settingsSchema.safeParse(input);
      if (!parsed.success)
        throw validationError("Rregullat nuk janë të vlefshme.");
      return repository.update(parsed.data, context);
    },
    async addException(input, context) {
      const parsed = exceptionSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError("Të dhënat e përjashtimit nuk janë të vlefshme.");
      }
      try {
        return await repository.addException(parsed.data, context);
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          throw new AppError({
            status: 409,
            code: "EMAIL_EXCEPTION_EXISTS",
            message: "Ky përjashtim ekziston tashmë.",
          });
        }
        throw error;
      }
    },
    async removeException(id, context) {
      if (!/^[1-9]\d*$/.test(String(id))) {
        throw new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "Përjashtimi nuk u gjet.",
        });
      }
      if (!(await repository.removeException(id, context))) {
        throw new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "Përjashtimi nuk u gjet.",
        });
      }
    },
  };
}
