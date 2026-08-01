import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.url("CLIENT_ORIGIN duhet të jetë një URL e vlefshme."),
  DB_HOST: z
    .string({ error: "DB_HOST është i detyrueshëm." })
    .trim()
    .min(1, "DB_HOST është i detyrueshëm."),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z
    .string({ error: "DB_NAME është i detyrueshëm." })
    .trim()
    .min(1, "DB_NAME është i detyrueshëm."),
  DB_USER: z
    .string({ error: "DB_USER është i detyrueshëm." })
    .trim()
    .min(1, "DB_USER është i detyrueshëm."),
  DB_PASSWORD: z
    .string({ error: "DB_PASSWORD është i detyrueshëm." })
    .min(1, "DB_PASSWORD është i detyrueshëm."),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
  JWT_ACCESS_SECRET: z
    .string({ error: "JWT_ACCESS_SECRET është i detyrueshëm." })
    .min(32, "JWT_ACCESS_SECRET duhet të ketë të paktën 32 karaktere."),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  READING_AGGREGATION_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .default(60),
  READING_RAW_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
  READING_MAINTENANCE_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .default(60),
});

export function parseEnvironment(source) {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Konfigurimi i serverit është i paplotë ose i pavlefshëm:\n${details}`,
    );
  }

  return Object.freeze(result.data);
}
