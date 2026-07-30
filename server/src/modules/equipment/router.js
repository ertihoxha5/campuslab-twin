import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

const tenantContext = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
  roles: request.auth.roles,
  ipAddress: request.ip?.slice(0, 45) ?? null,
});

export function createEquipmentRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);

  router.get(
    "/",
    requirePermissions(permissions.LABORATORIES_VIEW),
    async (request, response) => {
      const result = await service.list(request.query, tenantContext(request));
      return success(response, {
        data: { equipment: result.items },
        meta: { pagination: result.pagination },
      });
    },
  );

  router.post(
    "/",
    requirePermissions(permissions.ASSETS_MANAGE),
    async (request, response) => {
      const equipment = await service.create(
        request.body,
        tenantContext(request),
      );
      return success(response, {
        status: 201,
        data: {
          equipment,
          message: "Pajisja u krijua me sukses.",
        },
      });
    },
  );

  router.get(
    "/options",
    requirePermissions(permissions.ASSETS_MANAGE),
    async (request, response) => {
      const options = await service.options(
        request.query,
        tenantContext(request),
      );
      return success(response, { data: options });
    },
  );

  router.get(
    "/:equipmentId",
    requirePermissions(permissions.LABORATORIES_VIEW),
    async (request, response) => {
      const equipment = await service.detail(
        request.params.equipmentId,
        tenantContext(request),
      );
      return success(response, { data: { equipment } });
    },
  );

  router.put(
    "/:equipmentId",
    requirePermissions(permissions.ASSETS_MANAGE),
    async (request, response) => {
      const equipment = await service.update(
        request.params.equipmentId,
        request.body,
        tenantContext(request),
      );
      return success(response, {
        data: {
          equipment,
          message: "Pajisja u përditësua me sukses.",
        },
      });
    },
  );

  router.delete(
    "/:equipmentId",
    requirePermissions(permissions.ASSETS_MANAGE),
    async (request, response) => {
      const equipment = await service.archive(
        request.params.equipmentId,
        tenantContext(request),
      );
      return success(response, {
        data: {
          equipment,
          message: "Pajisja u arkivua me sukses.",
        },
      });
    },
  );

  return router;
}
