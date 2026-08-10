import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createUniversityProfileRouter({ service, authenticateTenant }) {
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
