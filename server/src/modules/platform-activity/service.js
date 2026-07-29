import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const listSchema = z.object({
  search: z.string().trim().max(190).optional().default(""),
  category: z
    .enum([
      "platform_auth",
      "university_registration",
      "university",
      "platform",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export function createPlatformActivityService({ repository }) {
  return {
    async list(input = {}) {
      const parsed = listSchema.safeParse(input);
      if (!parsed.success) {
        throw new AppError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Filtrat e historikut nuk janë të vlefshëm.",
        });
      }
      const { search, category, page, pageSize } = parsed.data;
      const result = await repository.list({
        search,
        category,
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
  };
}
