import { z } from "zod";

import { permissions } from "../../authorization/permissions.js";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { AppError } from "../../utils/app-error.js";

const allowedFiles = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);
const metadataSchema = z.object({
  maintenanceUpdateId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? String(value) : null)),
  caption: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
});
const validId = (value) => /^[1-9]\d*$/.test(String(value));
const matchesSignature = (mimeType, buffer) => {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  return false;
};

const validationError = (message) =>
  new AppError({ status: 422, code: "VALIDATION_ERROR", message });
const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Detyra ose përditësimi i mirëmbajtjes nuk u gjet.",
  });

export function createMaintenanceEvidenceService({ repository, storage }) {
  const access = (context) => ({
    universityId: context.universityId,
    userId: context.userId,
    restrictToAssignments: requiresLaboratoryAssignment(context),
    restrictToAssignedWork: !context.permissions.includes(
      permissions.MAINTENANCE_MANAGE,
    ),
  });

  return {
    async list(taskId, context) {
      if (!validId(taskId)) throw notFound();
      const result = await repository.listEvidence({
        ...access(context),
        taskId: String(taskId),
      });
      if (!result) throw notFound();
      return result;
    },

    async upload(taskId, file, input, context) {
      if (!validId(taskId)) throw notFound();
      if (!file?.buffer?.length) {
        throw validationError("Zgjidhni fotografinë ose dokumentin e evidencës.");
      }
      const extension = allowedFiles.get(file.mimetype);
      if (!extension) {
        throw validationError("Lejohen vetëm skedarët JPG, PNG, WebP dhe PDF.");
      }
      if (!matchesSignature(file.mimetype, file.buffer)) {
        throw validationError("Përmbajtja e skedarit nuk përputhet me formatin.");
      }
      const parsed = metadataSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError("Të dhënat e evidencës nuk janë të vlefshme.");
      }

      const stored = await storage.save({
        universityId: context.universityId,
        taskId: String(taskId),
        file,
        extension,
      });
      try {
        const result = await repository.addEvidence({
          ...access(context),
          taskId: String(taskId),
          ipAddress: context.ipAddress,
          evidence: {
            ...parsed.data,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            ...stored,
          },
        });
        if (!result || result.invalidUpdate) {
          throw notFound();
        }
        return result;
      } catch (error) {
        await storage.remove(stored.relativePath).catch(() => {});
        throw error;
      }
    },
  };
}
