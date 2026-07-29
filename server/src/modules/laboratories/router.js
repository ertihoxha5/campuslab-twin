import { Router } from "express";
import multer from "multer";
import { permissions } from "../../authorization/permissions.js";
import { createLaboratoryAccess } from "../../middleware/require-laboratory-access.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";

const modelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

const receiveModel = (request, response, next) => {
  modelUpload.single("model")(request, response, (error) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      next(
        new AppError({
          status: 422,
          code: "MODEL_TOO_LARGE",
          message: "Skedari nuk mund të jetë më i madh se 25 MB.",
        }),
      );
      return;
    }
    next(error);
  });
};

const tenantContext = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
  roles: request.auth.roles,
  ipAddress: request.ip?.slice(0, 45) ?? null,
});

export function createLaboratoryRouter({
  service,
  zoneService,
  modelService,
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
    "/archived",
    requirePermissions(permissions.LABORATORIES_CREATE),
    async (request, response) => {
      const result = await service.listArchived(
        request.query,
        tenantContext(request),
      );
      return success(response, {
        data: { laboratories: result.items },
        meta: { pagination: result.pagination },
      });
    },
  );

  router.get(
    "/responsible-users",
    requirePermissions(permissions.LABORATORIES_MANAGE),
    async (request, response) => {
      const users = await service.listResponsibleUsers(tenantContext(request));
      return success(response, { data: { users } });
    },
  );

  router.patch(
    "/:laboratoryId/restore",
    requirePermissions(permissions.LABORATORIES_CREATE),
    async (request, response) => {
      const laboratory = await service.restore(
        request.params.laboratoryId,
        tenantContext(request),
      );
      return success(response, {
        data: {
          laboratory,
          message: "Laboratori u rikthye me sukses.",
        },
      });
    },
  );

  router.post(
    "/:laboratoryId/model",
    requirePermissions(permissions.LABORATORIES_MANAGE),
    requireLaboratoryAccess,
    receiveModel,
    async (request, response) => {
      const model = await modelService.upload(request.file, {
        ...tenantContext(request),
        laboratoryId: request.params.laboratoryId,
      });
      return success(response, {
        status: 201,
        data: { model, message: "Pamja virtuale u ngarkua me sukses." },
      });
    },
  );

  router.get(
    "/:laboratoryId/model",
    requirePermissions(permissions.LABORATORIES_VIEW),
    requireLaboratoryAccess,
    async (request, response, next) => {
      try {
        const model = await modelService.getDownload({
          ...tenantContext(request),
          laboratoryId: request.params.laboratoryId,
        });
        response.sendFile(model.absolutePath, {
          headers: {
            "Cache-Control": "private, no-store",
            "Content-Type": model.mimeType,
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(model.originalName)}`,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:laboratoryId/model",
    requirePermissions(permissions.LABORATORIES_MANAGE),
    requireLaboratoryAccess,
    async (request, response) => {
      const model = await modelService.remove({
        ...tenantContext(request),
        laboratoryId: request.params.laboratoryId,
      });
      return success(response, {
        data: { model, message: "Pamja virtuale u hoq nga laboratori." },
      });
    },
  );

  router.get(
    "/:laboratoryId/zones",
    requirePermissions(permissions.LABORATORIES_VIEW),
    requireLaboratoryAccess,
    async (request, response) => {
      const zones = await zoneService.list(
        request.params.laboratoryId,
        tenantContext(request),
      );
      return success(response, { data: { zones } });
    },
  );

  router.post(
    "/:laboratoryId/zones",
    requirePermissions(permissions.LABORATORIES_MANAGE),
    requireLaboratoryAccess,
    async (request, response) => {
      const zone = await zoneService.create(
        request.params.laboratoryId,
        request.body,
        tenantContext(request),
      );
      return success(response, {
        status: 201,
        data: { zone, message: "Zona u krijua me sukses." },
      });
    },
  );

  router.put(
    "/:laboratoryId/zones/:zoneId",
    requirePermissions(permissions.LABORATORIES_MANAGE),
    requireLaboratoryAccess,
    async (request, response) => {
      const zone = await zoneService.update(
        request.params.laboratoryId,
        request.params.zoneId,
        request.body,
        tenantContext(request),
      );
      return success(response, {
        data: { zone, message: "Zona u përditësua me sukses." },
      });
    },
  );

  router.delete(
    "/:laboratoryId/zones/:zoneId",
    requirePermissions(permissions.LABORATORIES_MANAGE),
    requireLaboratoryAccess,
    async (request, response) => {
      const zone = await zoneService.remove(
        request.params.laboratoryId,
        request.params.zoneId,
        tenantContext(request),
      );
      return success(response, {
        data: { zone, message: "Zona u fshi me sukses." },
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
