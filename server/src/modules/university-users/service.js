import { z } from "zod";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { AppError } from "../../utils/app-error.js";

const permittedRoleCodes = new Set([
  "university_admin",
  "lab_manager",
  "technician",
  "academic_staff",
  "observer",
]);
const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["invited", "active", "inactive"]).optional(),
  search: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => value || undefined),
});
const createSchema = z
  .object({
    fullName: z.string().trim().min(3).max(160),
    email: z
      .string()
      .trim()
      .email()
      .max(190)
      .transform((value) => value.toLowerCase()),
    phone: optionalText(40),
    jobTitle: optionalText(120),
    status: z.enum(["invited", "active"]).default("active"),
    password: z.string().min(12).max(128).optional(),
    roles: z
      .array(z.string())
      .min(1)
      .max(5)
      .transform((roles) => [...new Set(roles)]),
    laboratoryIds: z
      .array(z.coerce.number().int().positive().transform(String))
      .max(100)
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .superRefine((value, context) => {
    if (value.status === "active" && !value.password) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Fjalëkalimi është i detyrueshëm për përdoruesin aktiv.",
      });
    }
    if (value.roles.some((role) => !permittedRoleCodes.has(role))) {
      context.addIssue({
        code: "custom",
        path: ["roles"],
        message: "Roli i zgjedhur nuk lejohet në universitet.",
      });
    }
  });
const updateSchema = z
  .object({
    fullName: z.string().trim().min(3).max(160),
    email: z
      .string()
      .trim()
      .email()
      .max(190)
      .transform((value) => value.toLowerCase()),
    phone: optionalText(40),
    jobTitle: optionalText(120),
    roles: z
      .array(z.string())
      .min(1)
      .max(5)
      .transform((roles) => [...new Set(roles)]),
    laboratoryIds: z
      .array(z.coerce.number().int().positive().transform(String))
      .max(100)
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .superRefine((value, context) => {
    if (value.roles.some((role) => !permittedRoleCodes.has(role))) {
      context.addIssue({
        code: "custom",
        path: ["roles"],
        message: "Roli i zgjedhur nuk lejohet në universitet.",
      });
    }
  });
const statusSchema = z.object({ status: z.enum(["active", "inactive"]) });

export function createUniversityUserService({
  repository,
  passwordRounds = 12,
}) {
  return {
    async list(input, context) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) throw validationError();
      const result = await repository.list({
        ...parsed.data,
        universityId: context.universityId,
      });
      return {
        users: result.users.map(mapUser),
        pagination: {
          page: parsed.data.page,
          pageSize: parsed.data.pageSize,
          total: result.total,
        },
      };
    },

    async options(context) {
      const result = await repository.options(context.universityId);
      return {
        roles: result.roles
          .filter((role) => permittedRoleCodes.has(role.code))
          .map((role) => ({ ...role, id: String(role.id) })),
        laboratories: result.laboratories.map((laboratory) => ({
          ...laboratory,
          id: String(laboratory.id),
        })),
      };
    },

    async create(input, context) {
      const parsed = createSchema.safeParse(input);
      if (!parsed.success)
        throw validationError(
          "Të dhënat e përdoruesit nuk janë të vlefshme.",
          parsed.error.issues,
        );
      const password =
        parsed.data.password ?? randomBytes(32).toString("base64url");
      try {
        const result = await repository.create({
          ...parsed.data,
          password: undefined,
          passwordHash: await bcrypt.hash(password, passwordRounds),
          universityId: context.universityId,
          actorUserId: context.userId,
          ipAddress: context.ipAddress,
        });
        if (result.invalidRoles)
          throw validationError("Një ose më shumë role nuk janë të vlefshme.");
        if (result.invalidLaboratories)
          throw validationError(
            "Një ose më shumë laboratorë nuk i përkasin universitetit tuaj.",
          );
        return result.user;
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
          throw new AppError({
            status: 409,
            code: "USER_EXISTS",
            message:
              "Një përdorues me këtë email ekziston tashmë në universitet.",
          });
        }
        throw error;
      }
    },

    async update(userId, input, context) {
      if (!validId(userId)) throw userNotFound();
      const parsed = updateSchema.safeParse(input);
      if (!parsed.success)
        throw validationError(
          "Të dhënat e përdoruesit nuk janë të vlefshme.",
          parsed.error.issues,
        );
      try {
        const result = await repository.update({
          ...parsed.data,
          userId: String(userId),
          universityId: context.universityId,
          actorUserId: context.userId,
          ipAddress: context.ipAddress,
        });
        return validateMutation(result);
      } catch (error) {
        rethrowConflict(error);
      }
    },

    async setStatus(userId, input, context) {
      if (!validId(userId)) throw userNotFound();
      const parsed = statusSchema.safeParse(input);
      if (!parsed.success)
        throw validationError("Statusi nuk është i vlefshëm.");
      if (
        String(userId) === String(context.userId) &&
        parsed.data.status === "inactive"
      ) {
        throw validationError("Nuk mund ta çaktivizoni llogarinë tuaj aktive.");
      }
      const user = await repository.setStatus({
        userId: String(userId),
        status: parsed.data.status,
        universityId: context.universityId,
        actorUserId: context.userId,
        ipAddress: context.ipAddress,
      });
      if (!user) throw userNotFound();
      return user;
    },
  };
}

function validateMutation(result) {
  if (!result) throw userNotFound();
  if (result.invalidRoles)
    throw validationError("Një ose më shumë role nuk janë të vlefshme.");
  if (result.invalidLaboratories)
    throw validationError(
      "Një ose më shumë laboratorë nuk i përkasin universitetit tuaj.",
    );
  return result.user;
}

function rethrowConflict(error) {
  if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
    throw new AppError({
      status: 409,
      code: "USER_EXISTS",
      message: "Një përdorues me këtë email ekziston tashmë në universitet.",
    });
  }
  throw error;
}

function validId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

function userNotFound() {
  return new AppError({
    status: 404,
    code: "USER_NOT_FOUND",
    message: "Përdoruesi nuk u gjet.",
  });
}

function mapUser(user) {
  return {
    ...user,
    id: String(user.id),
    universityId: String(user.universityId),
    roles: user.roleCodes ? user.roleCodes.split(",") : [],
    laboratories: user.laboratoryAssignments
      ? user.laboratoryAssignments.split("||").map((assignment) => {
          const [id, ...name] = assignment.split("::");
          return { id, name: name.join("::") };
        })
      : [],
    roleCodes: undefined,
    laboratoryAssignments: undefined,
  };
}

function optionalText(max) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);
}

function validationError(
  message = "Filtrat e përdoruesve nuk janë të vlefshëm.",
  issues,
) {
  return new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message,
    details: issues
      ? Object.fromEntries(
          issues.map((issue) => [
            String(issue.path[0] ?? "form"),
            [issue.message],
          ]),
        )
      : undefined,
  });
}
