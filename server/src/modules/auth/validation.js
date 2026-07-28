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

const emailSchema = z.object({
  email: z
    .email("Email-i nuk është i vlefshëm.")
    .trim()
    .toLowerCase()
    .max(190, "Email-i është shumë i gjatë."),
});

const strongPasswordSchema = z
  .string({ error: "Fjalëkalimi është i detyrueshëm." })
  .min(12, "Fjalëkalimi duhet të ketë të paktën 12 karaktere.")
  .max(128, "Fjalëkalimi është shumë i gjatë.")
  .regex(/[a-z]/, "Fjalëkalimi duhet të përmbajë një shkronjë të vogël.")
  .regex(/[A-Z]/, "Fjalëkalimi duhet të përmbajë një shkronjë të madhe.")
  .regex(/[0-9]/, "Fjalëkalimi duhet të përmbajë një numër.")
  .regex(/[^A-Za-z0-9]/, "Fjalëkalimi duhet të përmbajë një simbol.");

const resetPasswordSchema = z
  .object({
    token: z
      .string({ error: "Token-i i rikuperimit është i detyrueshëm." })
      .min(32, "Token-i i rikuperimit nuk është i vlefshëm.")
      .max(256, "Token-i i rikuperimit nuk është i vlefshëm."),
    password: strongPasswordSchema,
    confirmPassword: z.string({
      error: "Konfirmimi i fjalëkalimit është i detyrueshëm.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Fjalëkalimet nuk përputhen.",
  });

function parse(schema, input, message) {
  const result = schema.safeParse(input);

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
      message,
      details,
    });
  }

  return result.data;
}

export function validateLoginInput(input) {
  return parse(loginSchema, input, "Të dhënat e kyçjes nuk janë të vlefshme.");
}

export function validateForgotPasswordInput(input) {
  return parse(emailSchema, input, "Email-i i dërguar nuk është i vlefshëm.");
}

export function validateResetPasswordInput(input) {
  return parse(
    resetPasswordSchema,
    input,
    "Të dhënat për fjalëkalimin e ri nuk janë të vlefshme.",
  );
}
