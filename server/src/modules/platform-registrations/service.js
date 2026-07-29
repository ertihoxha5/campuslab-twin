import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  search: z.string().trim().max(190).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

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
  };
}
