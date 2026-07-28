import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const loginSchema = z.object({
  email: z
    .email("Email-i nuk është i vlefshëm.")
    .trim()
    .toLowerCase()
    .max(190, "Email-i është shumë i gjatë."),
  password: z
    .string({ error: "Fjalëkalimi është i detyrueshëm." })
    .min(1, "Fjalëkalimi është i detyrueshëm.")
    .max(128, "Fjalëkalimi është shumë i gjatë."),
  rememberMe: z.boolean().optional().default(false),
});

export function validateLoginInput(input) {
  const result = loginSchema.safeParse(input);

  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] ?? "form";
      details[field] ??= [];
      details[field].push(issue.message);
    }

    throw new AppError({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Të dhënat e kyçjes nuk janë të vlefshme.",
      details,
    });
  }

  return result.data;
}
