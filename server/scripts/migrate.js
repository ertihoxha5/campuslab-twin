import { parseEnvironment } from "../src/config/env.js";
import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { migrateUp } from "../src/database/migration-runner.js";

loadEnvironmentFile();

try {
  await migrateUp(parseEnvironment(process.env));
} catch (error) {
  console.error("Migrimi dështoi:", error.message);
  process.exitCode = 1;
}
