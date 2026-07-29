import { verifyPlatformAccessToken } from "../modules/auth/tokens.js";
import { AppError } from "../utils/app-error.js";
import { permissionsForRoles } from "../authorization/permissions.js";

export const PLATFORM_ACCESS_COOKIE = "clt_platform_access";

const authenticationError = () =>
  new AppError({
    status: 401,
    code: "UNAUTHENTICATED",
    message: "Sesioni juaj nuk është i vlefshëm. Ju lutemi kyçuni përsëri.",
  });

export function createPlatformAuthentication({
  platformAuthRepository,
  accessSecret,
}) {
  return async function authenticatePlatform(request, _response, next) {
    try {
      const token = request.cookies?.[PLATFORM_ACCESS_COOKIE];
      if (!token) throw authenticationError();

      const payload = verifyPlatformAccessToken(token, accessSecret);
      if (payload.type !== "platform_admin" || !payload.sub) {
        throw authenticationError();
      }

      const administrator = await platformAuthRepository.findActiveById(
        payload.sub,
      );
      if (!administrator || administrator.status !== "active") {
        throw authenticationError();
      }

      const roles = Object.freeze(["platform_admin"]);
      request.auth = Object.freeze({
        accountType: "platform_admin",
        platformAdminId: String(administrator.id),
        roles,
        permissions: Object.freeze(permissionsForRoles(roles)),
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
