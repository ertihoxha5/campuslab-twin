import { Router } from "express";
import multer from "multer";
import { AppError } from "../../utils/app-error.js";
import { success } from "../../utils/api-response.js";

const acceptedLogoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidImageSignature(file) {
  if (!file) {
    return true;
  }

  const bytes = file.buffer;

  if (file.mimetype === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.mimetype === "image/png") {
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (file.mimetype === "image/webp") {
    return (
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!acceptedLogoTypes.has(file.mimetype)) {
      callback(
        new AppError({
          status: 422,
          code: "INVALID_LOGO_TYPE",
          message: "Logoja duhet të jetë skedar JPG, PNG ose WebP.",
        }),
      );
      return;
    }

    callback(null, true);
  },
});

export function createUniversityRegistrationRouter({ registrationService }) {
  const router = Router();

  router.post(
    "/university-registrations",
    logoUpload.single("logo"),
    async (request, response, next) => {
      try {
        if (!hasValidImageSignature(request.file)) {
          throw new AppError({
            status: 422,
            code: "INVALID_LOGO_CONTENT",
            message: "Përmbajtja e logos nuk përputhet me formatin e skedarit.",
          });
        }

        const registration = await registrationService.register(
          request.body,
          request.file,
          { ipAddress: request.ip?.slice(0, 45) ?? null },
        );

        return success(response, {
          status: 201,
          data: {
            id: registration.id,
            status: "pending",
            message:
              "Kërkesa u dërgua me sukses dhe është në pritje të shqyrtimit.",
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
