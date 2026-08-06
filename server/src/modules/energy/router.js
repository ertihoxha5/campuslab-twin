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
        ipAddress: request.ip?.slice(0, 45) ?? null,
      });
      return success(response, { data: { overview } });
    },
  );
  router.get(
    "/settings",
    requirePermissions(permissions.MONITORING_VIEW),
    async (request, response) => {
      const settings = await service.settings({
        universityId: request.auth.universityId,
        userId: request.auth.userId,
      });
      return success(response, { data: { settings } });
    },
  );
  router.put(
    "/settings",
    requirePermissions(permissions.UNIVERSITY_PROFILE_MANAGE),
    async (request, response) => {
      const settings = await service.updateSettings(request.body, {
        universityId: request.auth.universityId,
        userId: request.auth.userId,
        ipAddress: request.ip?.slice(0, 45) ?? null,
      });
      return success(response, {
        data: { settings, message: "Tarifa e energjisë u ruajt me sukses." },
      });
    },
  );
  return router;
}
