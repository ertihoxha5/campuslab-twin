import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { parseEnvironment } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query, withTransaction } from "../src/database/query.js";
import { createSimulatorRepository } from "../src/modules/simulator/repository.js";
import { seedThesisSensors } from "./seed-thesis-sensors.js";

loadEnvironmentFile();
const pool = createDatabasePool(parseEnvironment(process.env));
try {
  const context = { universityId: "6", laboratoryId: "5", userId: "10", restrictToAssignments: false };
  const rows = await query(pool, `SELECT l.code, l.name, l.capacity, u.name AS university
    FROM laboratories l JOIN universities u ON u.id = l.university_id
    WHERE l.id = ? AND l.university_id = ? AND l.deleted_at IS NULL`, [context.laboratoryId, context.universityId]);
  if (rows.length !== 1 || rows[0].code !== "LAB-AUT-01" || rows[0].university !== "UBT - Higher Education Institution") {
    throw new Error("Laboratori i zgjedhur nuk përputhet me UBT / LAB-AUT-01.");
  }
  const runs = await query(pool, `SELECT id, status FROM simulation_runs
    WHERE university_id = ? AND laboratory_id = ? AND status IN ('queued','running','paused')`,
    [context.universityId, context.laboratoryId]);
  if (runs.length > 1 || (runs.length === 1 && String(runs[0].id) !== "8")) {
    throw new Error("U gjet një simulim aktiv i papritur; ndërpritet përgatitja.");
  }
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ laboratory: rows[0], activeRuns: runs, plannedCapacity: 25, applied: false }, null, 2));
  } else {
    if (runs.length) {
      const stopped = await createSimulatorRepository(pool).transition({ ...context, action: "stop" });
      if (stopped.status !== "stopped" || stopped.id !== "8") throw new Error("Simulimi 8 nuk u ndal siç pritej.");
    }
    if (Number(rows[0].capacity) === 24) {
      const affected = await withTransaction(pool, (connection) => query(connection,
        `UPDATE laboratories SET capacity = 25 WHERE id = 5 AND university_id = 6 AND capacity = 24`));
      if (affected.affectedRows !== 1) throw new Error("Kapaciteti ndryshoi gjatë përgatitjes.");
    } else if (Number(rows[0].capacity) !== 25) {
      throw new Error("Kapacitet i papritur; nuk ndryshohet.");
    }
    const seeded = await seedThesisSensors(pool, { laboratoryCode: "LAB-AUT-01", apply: true });
    console.log(JSON.stringify({ stoppedRun: runs[0]?.id ?? null, oldCapacity: rows[0].capacity,
      newCapacity: 25, sensors: seeded.sensors.map(({ code }) => code), applied: true }, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
