import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

const context = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
  roles: request.auth.roles,
});

export function createAlertRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);
  router.get(
    "/",
    requirePermissions(permissions.MONITORING_VIEW),
    async (request, response) => {
      const result = await service.list(request.query, context(request));
      return success(response, {
        data: { alerts: result.items },
        meta: { pagination: result.pagination },
      });
    },
  );
  router.get(
    "/:alertId",
    requirePermissions(permissions.MONITORING_VIEW),
    async (request, response) => {
      const alert = await service.detail(request.params.alertId, context(request));
      return success(response, { data: { alert } });
    },
  );
  return router;
}
