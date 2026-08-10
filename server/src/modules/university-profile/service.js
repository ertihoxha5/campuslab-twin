import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const profileSchema = z.object({
  name: z.string().trim().min(3).max(200),
  acronym: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[\p{L}\p{N}._-]+$/u)
    .transform((value) => value.toUpperCase()),
  institutionType: z.enum(["public", "private"]),
  city: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(255),
  officialWebsite: z
    .string()
    .trim()
    .url()
    .max(255)
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((value) => value || null),
  representativeName: z.string().trim().min(3).max(160),
  representativeEmail: z
    .string()
    .trim()
    .email()
    .max(190)
    .transform((value) => value.toLowerCase()),
});

export function createUniversityProfileService({ repository }) {
  return {
    async get(context) {
      const profile = await repository.get(context.universityId);
      if (!profile) throw notFound();
      return normalize(profile);
    },
    async update(input, context) {
      const parsed = profileSchema.safeParse(input);
      if (!parsed.success) throw validationError(parsed.error.issues);
      try {
        const profile = await repository.update({
          ...parsed.data,
          universityId: context.universityId,
          userId: context.userId,
          ipAddress: context.ipAddress,
        });
        if (!profile) throw notFound();
        return normalize(profile);
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
          throw new AppError({
            status: 409,
            code: "UNIVERSITY_PROFILE_CONFLICT",
            message:
              "Akronimi ose faqja zyrtare përdoret nga një universitet tjetër.",
          });
        }
        throw error;
      }
    },
  };
}

function normalize(profile) {
  return {
    ...profile,
    id: String(profile.id),
    logoFileId: profile.logoFileId == null ? null : String(profile.logoFileId),
  };
}

function validationError(issues) {
  return new AppError({
    status: 422,
    code: "VALIDATION_ERROR",
    message: "Të dhënat e profilit të universitetit nuk janë të vlefshme.",
    details: Object.fromEntries(
      issues.map((issue) => [String(issue.path[0] ?? "form"), [issue.message]]),
    ),
  });
}

function notFound() {
  return new AppError({
    status: 404,
    code: "UNIVERSITY_NOT_FOUND",
    message: "Universiteti nuk u gjet.",
  });
}
