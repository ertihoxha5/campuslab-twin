import { z } from "zod";
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

export function createUniversityUserService({ repository }) {
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
  };
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

function validationError() {
  return new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message: "Filtrat e përdoruesve nuk janë të vlefshëm.",
  });
}
