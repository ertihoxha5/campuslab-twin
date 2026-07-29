import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const listSchema = z.object({
  status: z.enum(["pending", "active", "rejected", "suspended"]).optional(),
  search: z.string().trim().max(190).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const statusSchema = z
  .object({
    status: z.enum(["active", "suspended"]),
    reason: z.string().trim().max(1000).optional().default(""),
  })
  .refine(
    ({ status, reason }) => status !== "suspended" || reason.length >= 3,
    {
      path: ["reason"],
      message: "Arsyeja e pezullimit është e detyrueshme.",
    },
  );

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Universiteti i kërkuar nuk u gjet.",
  });

export function createPlatformUniversityService({ repository }) {
  return {
    async list(input = {}) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Filtrat e universiteteve nuk janë të vlefshëm.",
        });
      }
      const { status, search, page, pageSize } = parsed.data;
      const result = await repository.list({
        status,
        search,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      return {
        items: result.items,
        pagination: {
          page,
          pageSize,
          total: result.total,
          pages: Math.ceil(result.total / pageSize),
        },
      };
    },

    async changeStatus(id, input, context) {
      if (!/^[1-9]\d*$/.test(String(id))) throw notFound();
      const parsed = statusSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Ndryshimi i statusit nuk është i vlefshëm.",
          details: {
            reason: parsed.error.issues.map((issue) => issue.message),
          },
        });
      }

      const result = await repository.changeStatus({
        universityId: id,
        nextStatus: parsed.data.status,
        reason: parsed.data.reason || null,
        platformAdminId: context.platformAdminId,
        ipAddress: context.ipAddress,
      });
      if (!result) throw notFound();
      if (result.invalidTransition) {
        throw new AppError({
          status: 409,
          code: "INVALID_STATUS_TRANSITION",
          message: "Universiteti nuk mund të kalojë në statusin e kërkuar.",
        });
      }
      return result;
    },
  };
}
