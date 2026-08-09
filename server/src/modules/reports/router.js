import { Router } from "express";
import { permissions } from "../../authorization/permissions.js";
import { requirePermissions } from "../../middleware/require-permission.js";
import { success } from "../../utils/api-response.js";

export function createReportRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);
  router.get(
    "/",
    requirePermissions(permissions.REPORTS_VIEW),
    async (request, response) => {
      const result = await service.list(request.query, context(request));
      return success(response, { data: result });
    },
  );
  router.post(
    "/",
    requirePermissions(permissions.REPORTS_GENERATE),
    async (request, response) => {
      const report = await service.create(request.body, context(request));
      return success(response, { status: 201, data: { report } });
    },
  );
  router.get(
    "/:reportId/download",
    requirePermissions(permissions.REPORTS_VIEW),
    async (request, response) => {
      const file = await service.download(
        request.params.reportId,
        context(request),
      );
      response.set({
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Content-Length": String(file.content.length),
        "Cache-Control": "private, no-store",
      });
      return response.send(file.content);
    },
  );
  return router;
}

function context(request) {
  return {
    universityId: request.auth.universityId,
    userId: request.auth.userId,
    roles: request.auth.roles,
  };
}
