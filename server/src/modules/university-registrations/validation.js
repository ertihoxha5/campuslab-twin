import { z } from "zod";
import { AppError } from "../../utils/app-error.js";

const publicEmailDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
]);

const registrationSchema = z
  .object({
    universityName: z
      .string({ error: "Emri i universitetit është i detyrueshëm." })
      .trim()
      .min(3, "Emri i universitetit duhet të ketë të paktën 3 karaktere.")
      .max(200, "Emri i universitetit është shumë i gjatë."),
    acronym: z
      .string({ error: "Shkurtesa është e detyrueshme." })
      .trim()
      .min(2, "Shkurtesa duhet të ketë të paktën 2 karaktere.")
      .max(30, "Shkurtesa është shumë e gjatë.")
      .regex(
        /^[A-Za-zÀ-ž0-9-]+$/,
        "Shkurtesa mund të përmbajë vetëm shkronja, numra dhe vizë.",
      )
      .transform((value) => value.toUpperCase()),
    institutionType: z.enum(["public", "private"], {
      error: "Zgjidhni llojin e institucionit.",
    }),
    city: z
      .string({ error: "Qyteti është i detyrueshëm." })
      .trim()
      .min(2, "Qyteti duhet të ketë të paktën 2 karaktere.")
      .max(120, "Emri i qytetit është shumë i gjatë."),
    address: z
      .string({ error: "Adresa është e detyrueshme." })
      .trim()
      .min(5, "Adresa duhet të ketë të paktën 5 karaktere.")
      .max(255, "Adresa është shumë e gjatë."),
    officialWebsite: z
      .url("Faqja zyrtare duhet të jetë një URL e vlefshme.")
      .refine(
        (value) => ["http:", "https:"].includes(new URL(value).protocol),
        "Faqja zyrtare duhet të përdorë HTTP ose HTTPS.",
      ),
    description: z
      .string()
      .trim()
      .max(3000, "Përshkrimi është shumë i gjatë.")
      .optional()
      .default(""),
    representativeName: z
      .string({ error: "Emri i përfaqësuesit është i detyrueshëm." })
      .trim()
      .min(3, "Emri i përfaqësuesit duhet të ketë të paktën 3 karaktere.")
      .max(160, "Emri i përfaqësuesit është shumë i gjatë."),
    representativeEmail: z
      .email("Email-i institucional nuk është i vlefshëm.")
      .trim()
      .toLowerCase()
      .max(190, "Email-i është shumë i gjatë."),
    representativePhone: z
      .string()
      .trim()
      .max(40, "Numri i telefonit është shumë i gjatë.")
      .regex(
        /^[+0-9 ()-]*$/,
        "Numri i telefonit përmban karaktere të palejuara.",
      )
      .optional()
      .default(""),
    password: z
      .string({ error: "Fjalëkalimi është i detyrueshëm." })
      .min(12, "Fjalëkalimi duhet të ketë të paktën 12 karaktere.")
      .max(128, "Fjalëkalimi është shumë i gjatë.")
      .regex(/[a-z]/, "Fjalëkalimi duhet të përmbajë një shkronjë të vogël.")
      .regex(/[A-Z]/, "Fjalëkalimi duhet të përmbajë një shkronjë të madhe.")
      .regex(/[0-9]/, "Fjalëkalimi duhet të përmbajë një numër.")
      .regex(/[^A-Za-z0-9]/, "Fjalëkalimi duhet të përmbajë një simbol."),
    confirmPassword: z.string({
      error: "Konfirmimi i fjalëkalimit është i detyrueshëm.",
    }),
    acceptsTerms: z
      .union([z.literal("true"), z.literal(true)], {
        error: "Duhet të pranoni kushtet e përdorimit.",
      })
      .transform(() => true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Fjalëkalimet nuk përputhen.",
  });

function validationDetails(issues) {
  return issues.reduce((details, issue) => {
    const field = issue.path[0] ?? "form";
    details[field] ??= [];
    details[field].push(issue.message);
    return details;
  }, {});
}

function normalizedHostname(value) {
  return value
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export function validateInstitutionalEmail(email, website, policy = {}) {
  const emailDomain = normalizedHostname(email.split("@").at(-1));
  const websiteDomain = normalizedHostname(new URL(website).hostname);
  const exceptionMatches = (policy.exceptions ?? []).some(
    (exception) =>
      emailDomain === normalizedHostname(exception.emailDomain) &&
      (!exception.websiteDomain ||
        websiteDomain === normalizedHostname(exception.websiteDomain)),
  );

  if (
    publicEmailDomains.has(emailDomain) &&
    !policy.allowPublicEmailProviders &&
    !exceptionMatches
  ) {
    throw new AppError({
      status: 422,
      code: "PUBLIC_EMAIL_NOT_ALLOWED",
      message: "Përdorni një email zyrtar të universitetit.",
      details: {
        representativeEmail: [
          "Ofruesit publikë të email-it nuk pranohen për regjistrim.",
        ],
      },
    });
  }

  const domainsMatch =
    emailDomain === websiteDomain ||
    emailDomain.endsWith(`.${websiteDomain}`) ||
    websiteDomain.endsWith(`.${emailDomain}`);

  if (
    policy.requireWebsiteDomainMatch !== false &&
    !domainsMatch &&
    !exceptionMatches
  ) {
    throw new AppError({
      status: 422,
      code: "INSTITUTIONAL_DOMAIN_MISMATCH",
      message:
        "Domain-i i email-it institucional nuk përputhet me faqen zyrtare.",
      details: {
        representativeEmail: [
          "Përdorni një email me të njëjtin domain institucional.",
        ],
      },
    });
  }
}

export function validateRegistrationInput(input, policy = {}) {
  const result = registrationSchema.safeParse(input);

  if (!result.success) {
    const details = validationDetails(result.error.issues);

    if (
      typeof input.password === "string" &&
      typeof input.confirmPassword === "string" &&
      input.password !== input.confirmPassword
    ) {
      details.confirmPassword ??= [];
      details.confirmPassword.push("Fjalëkalimet nuk përputhen.");
    }

    throw new AppError({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Të dhënat e regjistrimit nuk janë të vlefshme.",
      details,
    });
  }

  validateInstitutionalEmail(
    result.data.representativeEmail,
    result.data.officialWebsite,
    policy,
  );

  return result.data;
}
