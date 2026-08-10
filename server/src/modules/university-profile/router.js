import { Router } from "express";
import multer from "multer";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
const receiveLogo = (request, response, next) => {
  upload.single("logo")(request, response, (error) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      next(
        new AppError({
          status: 422,
          code: "LOGO_TOO_LARGE",
          message: "Logoja nuk mund të jetë më e madhe se 2 MB.",
        }),
      );
      return;
    }
    next(error);
  });
};

export function createUniversityProfileRouter({
  service,
  logoService,
  authenticateTenant,
}) {
  const router = Router();
  router.use(authenticateTenant);
  router.use(requirePermissions(permissions.UNIVERSITY_PROFILE_MANAGE));
  router.get("/", async (request, response) => {
    const profile = await service.get(context(request));
    return success(response, { data: { profile } });
  });
  router.put("/", async (request, response) => {
    const profile = await service.update(request.body, context(request));
    return success(response, {
      data: { profile, message: "Profili i universitetit u ruajt me sukses." },
    });
  });
  if (logoService) {
    router.post("/logo", receiveLogo, async (request, response) => {
      const logo = await logoService.upload(request.file, context(request));
      return success(response, {
        status: 201,
        data: { logo, message: "Logoja e universitetit u ruajt me sukses." },
      });
    });
  }
  return router;
}

function context(request) {
  return {
    universityId: request.auth.universityId,
    userId: request.auth.userId,
    roles: request.auth.roles,
    ipAddress: request.ip?.slice(0, 45) ?? null,
  };
}
