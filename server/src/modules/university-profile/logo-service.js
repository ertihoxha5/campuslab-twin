import { AppError } from "../../utils/app-error.js";

const extensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export function createUniversityLogoService({ repository, storage }) {
  return {
    async upload(file, context) {
      if (!file?.buffer?.length)
        throw validationError("Zgjidhni logon e universitetit.");
      const extension = extensions.get(file.mimetype);
      if (!extension)
        throw validationError("Logoja duhet të jetë JPG, PNG ose WebP.");
      if (!matchesSignature(file.mimetype, file.buffer))
        throw validationError("Përmbajtja e logos nuk përputhet me formatin.");
      const stored = await storage.save({
        universityId: context.universityId,
        file,
        extension,
      });
      try {
        const logo = await repository.attachLogo({
          universityId: context.universityId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          file: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            ...stored,
          },
        });
        if (!logo)
          throw new AppError({
            status: 404,
            code: "UNIVERSITY_NOT_FOUND",
            message: "Universiteti nuk u gjet.",
          });
        return logo;
      } catch (error) {
        await storage.remove(stored.relativePath).catch(() => {});
        throw error;
      }
    },
  };
}

function matchesSignature(mimeType, buffer) {
  if (mimeType === "image/jpeg")
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function validationError(message) {
  return new AppError({ status: 422, code: "VALIDATION_ERROR", message });
}
