import { parseEnvironment } from "../src/config/env.js";
import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { migrateDown } from "../src/database/migration-runner.js";

loadEnvironmentFile();

try {
  await migrateDown(parseEnvironment(process.env));
} catch (error) {
  console.error("Kthimi i migrimit dështoi:", error.message);
  process.exitCode = 1;
}
