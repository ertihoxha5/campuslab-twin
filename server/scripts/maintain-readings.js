import { parseEnvironment } from "../src/config/env.js";
import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { createDatabasePool } from "../src/database/pool.js";
import { createReadingHistoryMaintenance } from "../src/modules/simulator/history-maintenance.js";
import { createReadingHistoryRepository } from "../src/modules/simulator/history-repository.js";

loadEnvironmentFile();

const config = parseEnvironment(process.env);
const pool = createDatabasePool(config);
const maintenance = createReadingHistoryMaintenance({
  repository: createReadingHistoryRepository(pool),
  retentionDays: config.READING_RAW_RETENTION_DAYS,
  aggregationIntervalMinutes: config.READING_AGGREGATION_INTERVAL_MINUTES,
  maintenanceIntervalMinutes: config.READING_MAINTENANCE_INTERVAL_MINUTES,
  onError(error) {
    throw error;
  },
});

try {
  const result = await maintenance.runNow();
  if (result.reason === "failed") {
    throw new Error("Mirëmbajtja e historikut nuk mundi të përfundonte.");
  }
  console.log("Mirëmbajtja e historikut përfundoi:", result);
} catch (error) {
  console.error("Mirëmbajtja e historikut dështoi:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
