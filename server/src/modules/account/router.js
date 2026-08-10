import { Router } from "express";
import { success } from "../../utils/api-response.js";

export function createAccountRouter({ service, authenticateTenant }) {
  const router = Router();
  router.use(authenticateTenant);
  router.get("/", async (request, response) => {
    const account = await service.get(context(request));
    return success(response, { data: { account } });
  });
  router.put("/", async (request, response) => {
    const account = await service.updateProfile(request.body, context(request));
    return success(response, {
      data: { account, message: "Profili personal u ruajt me sukses." },
    });
  });
  router.put("/password", async (request, response) => {
    await service.changePassword(request.body, context(request));
    return success(response, {
      data: {
        message: "Fjalëkalimi u ndryshua. Kyçuni përsëri me fjalëkalimin e ri.",
      },
    });
  });
  return router;
}

function context(request) {
  return {
    universityId: request.auth.universityId,
    userId: request.auth.userId,
    ipAddress: request.ip?.slice(0, 45) ?? null,
  };
}
