import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createPlatformActivityRouter({
  service,
  authenticatePlatform,
}) {
  const router = Router();
  router.use(
    authenticatePlatform,
    requirePermissions(permissions.PLATFORM_AUDIT_VIEW),
  );
  router.get("/", async (request, response) => {
    const result = await service.list(request.query);
    return success(response, {
      data: { activities: result.items },
      meta: { pagination: result.pagination },
    });
  });
  return router;
}
