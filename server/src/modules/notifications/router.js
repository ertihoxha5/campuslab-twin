import { Router } from "express";
import { success } from "../../utils/api-response.js";

const context = (request) => ({
  universityId: request.auth.universityId,
  userId: request.auth.userId,
});

export function createNotificationRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);

  router.get("/", async (request, response) => {
    const result = await service.list(context(request));
    return success(response, {
      data: {
        notifications: result.items,
        unreadCount: result.unreadCount,
      },
    });
  });

  router.patch("/:notificationId/read", async (request, response) => {
    await service.markRead(request.params.notificationId, context(request));
    return success(response, {
      data: { message: "Njoftimi u shënua si i lexuar." },
    });
  });

  router.patch("/read-all", async (request, response) => {
    await service.markAllRead(context(request));
    return success(response, {
      data: { message: "Të gjitha njoftimet u shënuan si të lexuara." },
    });
  });

  return router;
}
