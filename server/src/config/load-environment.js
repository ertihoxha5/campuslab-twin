import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const projectDirectory = path.resolve(serverDirectory, "..");

export function loadEnvironmentFile({
  environment = process.env.NODE_ENV,
  rootDirectory = projectDirectory,
} = {}) {
  const fileName = environment === "test" ? ".env.test" : ".env";
  const filePath = path.join(rootDirectory, fileName);

  return dotenv.config({ path: filePath, quiet: true });
}
