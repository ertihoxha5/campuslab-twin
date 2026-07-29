import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createPlatformStatisticsRouter({
  repository,
  authenticatePlatform,
}) {
  const router = Router();
  router.use(
    authenticatePlatform,
    requirePermissions(permissions.PLATFORM_STATISTICS_VIEW),
  );

  router.get("/summary", async (_request, response) => {
    const summary = await repository.summary();
    return success(response, { data: { summary } });
  });

  return router;
}
