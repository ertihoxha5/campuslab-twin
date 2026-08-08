import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

const context = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
  roles: request.auth.roles,
  ipAddress: request.ip?.slice(0, 45) ?? null,
});

export function createSimulatorRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);
  router.use(requirePermissions(permissions.SIMULATIONS_RUN));

  router.get(
    "/laboratories/:laboratoryId/status",
    async (request, response) => {
      const result = await service.status(
        request.params.laboratoryId,
        context(request),
      );
      return success(response, { data: result });
    },
  );

  router.post(
    "/laboratories/:laboratoryId/preview",
    async (request, response) => {
      const preview = await service.preview(
        request.params.laboratoryId,
        request.body,
        context(request),
      );
      return success(response, { data: { preview } });
    },
  );

  router.post(
    "/laboratories/:laboratoryId/start",
    async (request, response) => {
      const run = await service.start(
        request.params.laboratoryId,
        request.body,
        context(request),
      );
      return success(response, {
        status: 201,
        data: { run, message: "Simulimi u nis me sukses." },
      });
    },
  );

  for (const action of ["pause", "resume", "stop", "reset"]) {
    router.post(
      `/laboratories/:laboratoryId/${action}`,
      async (request, response) => {
        const run = await service[action](
          request.params.laboratoryId,
          context(request),
        );
        const messages = {
          pause: "Simulimi u pezullua me sukses.",
          resume: "Simulimi rifilloi me sukses.",
          stop: "Simulimi u ndal me sukses.",
          reset: "Simulimi u rikthye në gjendjen bazë me sukses.",
        };
        return success(response, {
          data: { run, message: messages[action] },
        });
      },
    );
  }

  return router;
}
