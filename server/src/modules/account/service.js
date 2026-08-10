import bcrypt from "bcrypt";
import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const profileSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  email: z
    .string()
    .trim()
    .email()
    .max(190)
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40),
  jobTitle: optionalText(120),
});
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z
      .string()
      .min(12)
      .max(128)
      .regex(/[a-z]/, "Fjalëkalimi duhet të përmbajë një shkronjë të vogël.")
      .regex(/[A-Z]/, "Fjalëkalimi duhet të përmbajë një shkronjë të madhe.")
      .regex(/[0-9]/, "Fjalëkalimi duhet të përmbajë një numër.")
      .regex(/[^A-Za-z0-9]/, "Fjalëkalimi duhet të përmbajë një simbol."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Fjalëkalimet e reja nuk përputhen.",
  });

export function createAccountService({ repository, passwordRounds = 12 }) {
  return {
    async get(context) {
      const account = await repository.get(context);
      if (!account) throw notFound();
      return publicAccount(account);
    },
    async updateProfile(input, context) {
      const data = parse(
        profileSchema,
        input,
        "Profili personal nuk është i vlefshëm.",
      );
      try {
        const account = await repository.updateProfile({ ...data, ...context });
        if (!account) throw notFound();
        return publicAccount(account);
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") {
          throw new AppError({
            status: 409,
            code: "EMAIL_EXISTS",
            message:
              "Ky email përdoret tashmë nga një llogari e universitetit.",
          });
        }
        throw error;
      }
    },
    async changePassword(input, context) {
      const data = parse(
        passwordSchema,
        input,
        "Të dhënat e fjalëkalimit nuk janë të vlefshme.",
      );
      const account = await repository.get(context);
      if (!account) throw notFound();
      if (!(await bcrypt.compare(data.currentPassword, account.passwordHash))) {
        throw new AppError({
          status: 401,
          code: "INVALID_CURRENT_PASSWORD",
          message: "Fjalëkalimi aktual nuk është i saktë.",
        });
      }
      if (await bcrypt.compare(data.newPassword, account.passwordHash)) {
        throw new AppError({
          status: 422,
          code: "PASSWORD_UNCHANGED",
          message: "Fjalëkalimi i ri duhet të jetë ndryshe nga ai aktual.",
        });
      }
      await repository.updatePassword({
        ...context,
        passwordHash: await bcrypt.hash(data.newPassword, passwordRounds),
      });
    },
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
function parse(schema, input, message) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message,
    details: Object.fromEntries(
      result.error.issues.map((issue) => [
        String(issue.path[0] ?? "form"),
        [issue.message],
      ]),
    ),
  });
}
function publicAccount(account) {
  return {
    id: String(account.id),
    fullName: account.fullName,
    email: account.email,
    phone: account.phone ?? "",
    jobTitle: account.jobTitle ?? "",
    lastLoginAt: account.lastLoginAt ?? null,
    createdAt: account.createdAt,
  };
}
function notFound() {
  return new AppError({
    status: 404,
    code: "ACCOUNT_NOT_FOUND",
    message: "Llogaria nuk u gjet.",
  });
}
