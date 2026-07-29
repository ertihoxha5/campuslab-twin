import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createPlatformUniversityRouter({
  service,
  authenticatePlatform,
}) {
  const router = Router();
  router.use(
    authenticatePlatform,
    requirePermissions(permissions.PLATFORM_UNIVERSITIES_REVIEW),
  );

  router.get("/", async (request, response) => {
    const result = await service.list(request.query);
    return success(response, {
      data: { universities: result.items },
      meta: { pagination: result.pagination },
    });
  });

  router.patch("/:universityId/status", async (request, response) => {
    const university = await service.changeStatus(
      request.params.universityId,
      request.body,
      {
        platformAdminId: request.auth.platformAdminId,
        ipAddress: request.ip?.slice(0, 45) ?? null,
      },
    );
    return success(response, {
      data: {
        university,
        message:
          university.status === "suspended"
            ? "Universiteti u pezullua."
            : "Universiteti u riaktivizua.",
      },
    });
  });

  return router;
}
