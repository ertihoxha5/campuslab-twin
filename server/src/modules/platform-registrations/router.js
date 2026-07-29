import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createPlatformRegistrationRouter({
  service,
  authenticatePlatform,
}) {
  const router = Router();
  const canReview = requirePermissions(
    permissions.PLATFORM_UNIVERSITIES_REVIEW,
  );

  router.use(authenticatePlatform, canReview);

  router.get("/", async (request, response) => {
    const result = await service.list(request.query);
    return success(response, {
      data: { registrationRequests: result.items },
      meta: { pagination: result.pagination },
    });
  });

  router.get("/:requestId", async (request, response) => {
    const registrationRequest = await service.findById(
      request.params.requestId,
    );
    return success(response, { data: { registrationRequest } });
  });

  return router;
}
