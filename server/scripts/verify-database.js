import { parseEnvironment } from "../src/config/env.js";
import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { createDatabasePool } from "../src/database/pool.js";
import { verifyDatabase } from "../src/database/verify-database.js";

loadEnvironmentFile();

const config = parseEnvironment(process.env);
const pool = createDatabasePool(config);

try {
  const result = await verifyDatabase(pool, config.DB_NAME);

  console.log(
    `Verifikimi kaloi: ${result.tableCount} tabela të kërkuara, ` +
      `${result.tenantTableCount} tabela tenant dhe ` +
      `${result.universities.length} universitete demonstruese.`,
  );

  for (const university of result.universities) {
    console.log(
      `- ${university.name}: ${university.user_count} përdorues, ` +
        `${university.laboratory_count} laboratorë, ` +
        `${university.equipment_count} pajisje, ` +
        `${university.sensor_count} sensorë`,
    );
  }
} catch (error) {
  console.error("Verifikimi i bazës së të dhënave dështoi:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
