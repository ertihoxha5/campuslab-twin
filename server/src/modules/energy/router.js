import { Router } from "express";

import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createEnergyRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);
  router.get(
    "/overview",
    requirePermissions(permissions.MONITORING_VIEW),
    async (request, response) => {
      const overview = await service.overview(request.query, {
        universityId: request.auth.universityId,
        userId: request.auth.userId,
        roles: request.auth.roles,
      });
      return success(response, { data: { overview } });
    },
  );
  return router;
}
