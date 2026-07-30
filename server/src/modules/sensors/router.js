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

export function createSensorRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);

  router.get(
    "/",
    requirePermissions(permissions.LABORATORIES_VIEW),
    async (request, response) => {
      const result = await service.list(request.query, tenantContext(request));
      return success(response, {
        data: { sensors: result.items },
        meta: { pagination: result.pagination },
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

  router.post(
    "/",
    requirePermissions(permissions.ASSETS_MANAGE),
    async (request, response) => {
      const sensor = await service.create(request.body, tenantContext(request));
      return success(response, {
        status: 201,
        data: { sensor, message: "Sensori u krijua me sukses." },
      });
    },
  );

  router.get(
    "/:sensorId",
    requirePermissions(permissions.LABORATORIES_VIEW),
    async (request, response) => {
      const sensor = await service.detail(
        request.params.sensorId,
        tenantContext(request),
      );
      return success(response, { data: { sensor } });
    },
  );

  router.put(
    "/:sensorId",
    requirePermissions(permissions.ASSETS_MANAGE),
    async (request, response) => {
      const sensor = await service.update(
        request.params.sensorId,
        request.body,
        tenantContext(request),
      );
      return success(response, {
        data: { sensor, message: "Sensori u përditësua me sukses." },
      });
    },
  );

  router.delete(
    "/:sensorId",
    requirePermissions(permissions.ASSETS_MANAGE),
    async (request, response) => {
      const sensor = await service.archive(
        request.params.sensorId,
        tenantContext(request),
      );
      return success(response, {
        data: { sensor, message: "Sensori u arkivua me sukses." },
      });
    },
  );

  return router;
}
