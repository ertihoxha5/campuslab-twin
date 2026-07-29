import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { createLaboratoryAccess } from "../../middleware/require-laboratory-access.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

const tenantContext = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
  roles: request.auth.roles,
  ipAddress: request.ip?.slice(0, 45) ?? null,
});

export function createLaboratoryRouter({
  service,
  authenticateTenant,
  laboratoryAccessRepository,
}) {
  const router = Router();
  const requireLaboratoryAccess = createLaboratoryAccess({
    laboratoryAccessRepository,
  });
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

  router.get(
    "/:laboratoryId",
    requirePermissions(permissions.LABORATORIES_VIEW),
    requireLaboratoryAccess,
    async (request, response) => {
      const laboratory = await service.detail(
        request.params.laboratoryId,
        tenantContext(request),
      );
      return success(response, { data: { laboratory } });
    },
  );

  router.put(
    "/:laboratoryId",
    requirePermissions(permissions.LABORATORIES_MANAGE),
    requireLaboratoryAccess,
    async (request, response) => {
      const laboratory = await service.update(
        request.params.laboratoryId,
        request.body,
        tenantContext(request),
      );
      return success(response, {
        data: {
          laboratory,
          message: "Laboratori u përditësua me sukses.",
        },
      });
    },
  );

  router.delete(
    "/:laboratoryId",
    requirePermissions(permissions.LABORATORIES_CREATE),
    requireLaboratoryAccess,
    async (request, response) => {
      const laboratory = await service.archive(
        request.params.laboratoryId,
        tenantContext(request),
      );
      return success(response, {
        data: {
          laboratory,
          message: "Laboratori u arkivua me sukses.",
        },
      });
    },
  );

  return router;
}
