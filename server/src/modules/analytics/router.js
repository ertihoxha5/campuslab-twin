import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createAnalyticsRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);
  router.get(
    "/history",
    requirePermissions(permissions.REPORTS_VIEW),
    async (request, response) => {
      const analytics = await service.history(request.query, {
        universityId: request.auth.universityId,
        userId: request.auth.userId,
        roles: request.auth.roles,
      });
      return success(response, { data: { analytics } });
    },
  );
  return router;
}
