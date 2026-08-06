import { Router } from "express";
import multer from "multer";

import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";
import { AppError } from "../../utils/app-error.js";

const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
const receiveEvidence = (request, response, next) => {
  evidenceUpload.single("evidence")(request, response, (error) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      next(
        new AppError({
          status: 422,
          code: "EVIDENCE_TOO_LARGE",
          message: "Evidenca nuk mund të jetë më e madhe se 10 MB.",
        }),
      );
      return;
    }
    next(error);
  });
};

const context = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
  roles: request.auth.roles,
  permissions: request.auth.permissions,
  ipAddress: request.ip?.slice(0, 45) ?? null,
});

export function createMaintenanceRouter({
  service,
  evidenceService,
  authenticateTenant,
}) {
  const router = Router();
  router.use(authenticateTenant);

  router.get(
    "/",
    requirePermissions(permissions.MAINTENANCE_ASSIGNED),
    async (request, response) => {
      const result = await service.list(request.query, context(request));
      return success(response, {
        data: { tasks: result.items },
        meta: { pagination: result.pagination },
      });
    },
  );

  router.post(
    "/",
    requirePermissions(permissions.MAINTENANCE_MANAGE),
    async (request, response) => {
      const task = await service.create(request.body, context(request));
      return success(response, {
        status: 201,
        data: {
          task,
          message: "Detyra e mirëmbajtjes u krijua me sukses.",
        },
      });
    },
  );

  router.get(
    "/options",
    requirePermissions(permissions.MAINTENANCE_MANAGE),
    async (request, response) => {
      const options = await service.options(request.query, context(request));
      return success(response, { data: options });
    },
  );

  router.get(
    "/:taskId",
    requirePermissions(permissions.MAINTENANCE_ASSIGNED),
    async (request, response) => {
      const task = await service.detail(request.params.taskId, context(request));
      return success(response, { data: { task } });
    },
  );

  router.patch(
    "/:taskId/status",
    requirePermissions(permissions.MAINTENANCE_ASSIGNED),
    async (request, response) => {
      const task = await service.transition(
        request.params.taskId,
        request.body,
        context(request),
      );
      return success(response, {
        data: {
          task,
          message: "Statusi i mirëmbajtjes u përditësua me sukses.",
        },
      });
    },
  );

  if (evidenceService) {
    router.get(
      "/:taskId/evidence",
      requirePermissions(permissions.MAINTENANCE_ASSIGNED),
      async (request, response) => {
        const evidence = await evidenceService.list(
          request.params.taskId,
          context(request),
        );
        return success(response, { data: { evidence } });
      },
    );

    router.post(
      "/:taskId/evidence",
      requirePermissions(permissions.MAINTENANCE_ASSIGNED),
      receiveEvidence,
      async (request, response) => {
        const evidence = await evidenceService.upload(
          request.params.taskId,
          request.file,
          request.body,
          context(request),
        );
        return success(response, {
          status: 201,
          data: { evidence, message: "Evidenca u ngarkua me sukses." },
        });
      },
    );
  }

  return router;
}
