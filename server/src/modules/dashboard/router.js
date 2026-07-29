import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createDashboardRouter({ service, authenticateTenant }) {
  const router = Router();
  router.get(
    "/summary",
    authenticateTenant,
    requirePermissions(permissions.MONITORING_VIEW),
    async (request, response) => {
      const summary = await service.summary({
        universityId: request.auth.universityId,
        userId: request.auth.userId,
        roles: request.auth.roles,
      });
      return success(response, { data: { summary } });
    },
  );
  return router;
}
