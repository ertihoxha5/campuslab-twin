import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { parseEnvironment } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query } from "../src/database/query.js";
import { createSimulatorRepository } from "../src/modules/simulator/repository.js";

loadEnvironmentFile();
const pool = createDatabasePool(parseEnvironment(process.env));
try {
  const runs = await query(pool, `SELECT id FROM simulation_runs WHERE university_id = 6
    AND laboratory_id = 5 AND status = 'running'`);
  if (runs.length !== 1 || String(runs[0].id) !== "10") throw new Error("Ekzekutimi aktiv nuk është run 10.");
  const result = await createSimulatorRepository(pool).transition({ universityId: "6",
    laboratoryId: "5", userId: "10", restrictToAssignments: false, action: "stop" });
  console.log(JSON.stringify(result));
} finally { await pool.end(); }
