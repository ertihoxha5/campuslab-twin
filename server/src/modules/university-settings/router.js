import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createUniversitySettingsRouter({
  service,
  authenticateTenant,
}) {
  const router = Router();
  router.use(authenticateTenant);
  router.use(requirePermissions(permissions.UNIVERSITY_PROFILE_MANAGE));
  router.get("/", async (request, response) => {
    const settings = await service.get(context(request));
    return success(response, { data: { settings } });
  });
  router.put("/", async (request, response) => {
    const settings = await service.update(request.body, context(request));
    return success(response, {
      data: {
        settings,
        message: "Preferencat e universitetit u ruajtën me sukses.",
      },
    });
  });
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
