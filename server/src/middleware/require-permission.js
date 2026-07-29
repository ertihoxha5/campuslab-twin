import { AppError } from "../utils/app-error.js";

const forbidden = () =>
  new AppError({
    status: 403,
    code: "FORBIDDEN",
    message: "Nuk keni leje për të kryer këtë veprim.",
  });

function permissionSet(request) {
  if (!request.auth) {
    throw new AppError({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Duhet të kyçeni për të vazhduar.",
    });
  }
  return new Set(request.auth.permissions);
}

export function requirePermissions(...requiredPermissions) {
  return function authorizeAll(request, _response, next) {
    try {
      const granted = permissionSet(request);
      if (!requiredPermissions.every((permission) => granted.has(permission))) {
        throw forbidden();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAnyPermission(...acceptedPermissions) {
  return function authorizeAny(request, _response, next) {
    try {
      const granted = permissionSet(request);
      if (!acceptedPermissions.some((permission) => granted.has(permission))) {
        throw forbidden();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
