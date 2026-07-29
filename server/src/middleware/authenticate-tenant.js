import { ACCESS_COOKIE, verifyAccessToken } from "../modules/auth/tokens.js";
import { AppError } from "../utils/app-error.js";
import { permissionsForRoles } from "../authorization/permissions.js";

const unauthenticated = () =>
  new AppError({
    status: 401,
    code: "UNAUTHENTICATED",
    message: "Sesioni juaj nuk është i vlefshëm. Ju lutemi kyçuni përsëri.",
  });

const unavailable = () =>
  new AppError({
    status: 403,
    code: "ACCOUNT_UNAVAILABLE",
    message:
      "Llogaria ose universiteti nuk është aktiv. Kontaktoni administratorin.",
  });

export function createTenantAuthentication({ authRepository, accessSecret }) {
  return async function authenticateTenant(request, _response, next) {
    try {
      const token = request.cookies?.[ACCESS_COOKIE];
      if (!token) throw unauthenticated();

      const payload = verifyAccessToken(token, accessSecret);
      if (
        payload.type !== "university" ||
        !payload.sub ||
        !payload.universityId
      ) {
        throw unauthenticated();
      }

      const user = await authRepository.findActiveUserById(
        payload.sub,
        payload.universityId,
      );

      if (
        !user ||
        user.userStatus !== "active" ||
        user.universityStatus !== "active"
      ) {
        throw unavailable();
      }

      const roles = Object.freeze([...user.roles]);
      request.auth = Object.freeze({
        accountType: "university",
        userId: String(user.id),
        universityId: String(user.universityId),
        roles,
        permissions: Object.freeze(permissionsForRoles(roles)),
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
