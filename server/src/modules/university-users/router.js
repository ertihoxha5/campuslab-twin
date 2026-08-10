import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createUniversityUserRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);
  router.use(requirePermissions(permissions.UNIVERSITY_USERS_MANAGE));
  router.get("/", async (request, response) => {
    const result = await service.list(request.query, context(request));
    return success(response, { data: result });
  });
  router.get("/options", async (request, response) => {
    const options = await service.options(context(request));
    return success(response, { data: { options } });
  });
  return router;
}

function context(request) {
  return {
    universityId: request.auth.universityId,
    userId: request.auth.userId,
    roles: request.auth.roles,
  };
}
