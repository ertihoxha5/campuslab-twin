import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  search: z.string().trim().max(190).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const reviewSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().max(1000).optional().default(""),
  })
  .refine(
    ({ decision, reason }) => decision !== "rejected" || reason.length >= 3,
    {
      path: ["reason"],
      message: "Arsyeja e refuzimit është e detyrueshme.",
    },
  );

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Kërkesa e regjistrimit nuk u gjet.",
  });

export function createPlatformRegistrationService({ repository }) {
  return {
    async list(input = {}) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Filtrat e kërkesave nuk janë të vlefshëm.",
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

    async findById(id) {
      if (!/^[1-9]\d*$/.test(String(id))) throw notFound();
      const registration = await repository.findById(id);
      if (!registration) throw notFound();
      return registration;
    },

    async review(id, input, context) {
      if (!/^[1-9]\d*$/.test(String(id))) throw notFound();
      const parsed = reviewSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Vendimi i shqyrtimit nuk është i vlefshëm.",
          details: {
            reason: parsed.error.issues.map((issue) => issue.message),
          },
        });
      }

      try {
        const result = await repository.review({
          requestId: id,
          platformAdminId: context.platformAdminId,
          decision: parsed.data.decision,
          reason: parsed.data.reason || null,
          ipAddress: context.ipAddress,
        });
        if (!result) throw notFound();
        if (result.alreadyReviewed) {
          throw new AppError({
            status: 409,
            code: "ALREADY_REVIEWED",
            message: "Kjo kërkesë është shqyrtuar më parë.",
          });
        }
        return result;
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          throw new AppError({
            status: 409,
            code: "UNIVERSITY_CONFLICT",
            message:
              "Universiteti nuk mund të aktivizohet sepse të dhënat institucionale janë në përdorim.",
          });
        }
        throw error;
      }
    },
  };
}
