import { Router } from "express";

import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

const context = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
  roles: request.auth.roles,
  permissions: request.auth.permissions,
  ipAddress: request.ip?.slice(0, 45) ?? null,
});

export function createMaintenanceRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);

  router.get(
    "/",
    requirePermissions(permissions.MAINTENANCE_ASSIGNED),
    async (request, response) => {
      const result = await service.list(request.query, context(request));
      return success(response, {
        data: { tasks: result.items },
        meta: { pagination: result.pagination },
      });
    },
  );

  router.post(
    "/",
    requirePermissions(permissions.MAINTENANCE_MANAGE),
    async (request, response) => {
      const task = await service.create(request.body, context(request));
      return success(response, {
        status: 201,
        data: {
          task,
          message: "Detyra e mirëmbajtjes u krijua me sukses.",
        },
      });
    },
  );

  return router;
}
