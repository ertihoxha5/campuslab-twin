import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.url("CLIENT_ORIGIN duhet të jetë një URL e vlefshme."),
  DB_HOST: z.string().trim().min(1, "DB_HOST është i detyrueshëm."),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().trim().min(1, "DB_NAME është i detyrueshëm."),
  DB_USER: z.string().trim().min(1, "DB_USER është i detyrueshëm."),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD është i detyrueshëm."),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
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
