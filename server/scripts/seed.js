import { parseEnvironment } from "../src/config/env.js";
import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { createDatabasePool } from "../src/database/pool.js";
import { seedDemoData } from "../seeds/demo.js";

loadEnvironmentFile();

const config = parseEnvironment(process.env);
const pool = createDatabasePool(config);

try {
  const result = await seedDemoData(pool, {
    password: process.env.DEMO_ACCOUNT_PASSWORD ?? "CampusLab!2026",
  });

  console.log(
    result.skipped
      ? "Të dhënat demonstruese ekzistojnë tashmë."
      : "Të dhënat demonstruese u krijuan me sukses.",
  );
} catch (error) {
  console.error("Mbushja e bazës së të dhënave dështoi:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
