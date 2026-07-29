import { AppError } from "../utils/app-error.js";

const unrestrictedLaboratoryRoles = new Set(["university_admin"]);

export function requiresLaboratoryAssignment(auth) {
  return !auth.roles.some((role) => unrestrictedLaboratoryRoles.has(role));
}

export function createLaboratoryAccess({
  laboratoryAccessRepository,
  parameterName = "laboratoryId",
}) {
  return async function requireLaboratoryAccess(request, _response, next) {
    try {
      if (request.auth?.accountType !== "university") {
        throw new AppError({
          status: 401,
          code: "UNAUTHENTICATED",
          message: "Duhet të kyçeni si përdorues universiteti.",
        });
      }

      const laboratoryId = request.params?.[parameterName];
      if (!laboratoryId) {
        throw new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "Laboratori i kërkuar nuk u gjet.",
        });
      }

      const requiresAssignment = requiresLaboratoryAssignment(request.auth);
      const laboratory =
        await laboratoryAccessRepository.findAccessibleLaboratory({
          universityId: request.auth.universityId,
          userId: request.auth.userId,
          laboratoryId,
          requiresAssignment,
        });

      if (!laboratory) {
        throw new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "Laboratori i kërkuar nuk u gjet.",
        });
      }

      request.laboratoryAccess = Object.freeze({
        laboratoryId: String(laboratory.id),
        assignmentRequired: requiresAssignment,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
