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

export function createLaboratoryRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);

  router.get(
    "/",
    requirePermissions(permissions.LABORATORIES_VIEW),
    async (request, response) => {
      const result = await service.list(request.query, tenantContext(request));
      return success(response, {
        data: { laboratories: result.items },
        meta: { pagination: result.pagination },
      });
    },
  );

  router.post(
    "/",
    requirePermissions(permissions.LABORATORIES_CREATE),
    async (request, response) => {
      const laboratory = await service.create(
        request.body,
        tenantContext(request),
      );
      return success(response, {
        status: 201,
        data: {
          laboratory,
          message: "Laboratori u krijua me sukses.",
        },
      });
    },
  );

  return router;
}
