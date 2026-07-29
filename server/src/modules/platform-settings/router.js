import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

const context = (request) => ({
  platformAdminId: request.auth.platformAdminId,
  ipAddress: request.ip?.slice(0, 45) ?? null,
});

export function createPlatformSettingsRouter({
  service,
  authenticatePlatform,
}) {
  const router = Router();
  router.use(
    authenticatePlatform,
    requirePermissions(permissions.PLATFORM_SETTINGS_MANAGE),
  );
  router.get("/", async (_request, response) =>
    success(response, { data: await service.get() }),
  );
  router.put("/", async (request, response) =>
    success(response, {
      data: { settings: await service.update(request.body, context(request)) },
    }),
  );
  router.post("/email-exceptions", async (request, response) =>
    success(response, {
      status: 201,
      data: {
        exception: await service.addException(request.body, context(request)),
      },
    }),
  );
  router.delete("/email-exceptions/:exceptionId", async (request, response) => {
    await service.removeException(request.params.exceptionId, context(request));
    return success(response, {
      data: { message: "Përjashtimi u hoq." },
    });
  });
  return router;
}
