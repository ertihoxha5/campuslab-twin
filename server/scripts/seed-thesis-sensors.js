import { parseEnvironment } from "../src/config/env.js";
import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query, withTransaction } from "../src/database/query.js";
import { thesisTestSensors } from "../seeds/thesis-test-sensors.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArguments(argv) {
  const laboratoryArgument = argv.find((value) => value.startsWith("--laboratory-code="));
  const laboratoryCode = laboratoryArgument?.slice("--laboratory-code=".length).trim();
  if (!laboratoryCode || !/^[A-Za-z0-9_-]+$/.test(laboratoryCode)) {
    throw new Error("Jepni --laboratory-code=KODI_I_LABORATORIT.");
  }
  return { laboratoryCode, apply: argv.includes("--apply") };
}

export async function seedThesisSensors(pool, { laboratoryCode, apply = false }) {
  const laboratories = await query(
    pool,
    `SELECT id, university_id AS universityId, name, capacity
     FROM laboratories
     WHERE code = ? AND deleted_at IS NULL`,
    [laboratoryCode],
  );
  if (laboratories.length !== 1) {
    throw new Error("Kodi duhet të identifikojë saktësisht një laborator aktiv.");
  }
  const laboratory = laboratories[0];
  if (Number(laboratory.capacity) !== 25) {
    throw new Error(`Kapaciteti i laboratorit është ${laboratory.capacity}; testi i tezës kërkon 25 persona. Ndryshojeni qëllimisht në aplikacion para seed-it.`);
  }
  if (!apply) return { laboratory, sensors: thesisTestSensors, applied: false };

  await withTransaction(pool, async (connection) => {
    for (const sensor of thesisTestSensors) {
      const existing = await query(
        connection,
        `SELECT id, laboratory_id AS laboratoryId FROM sensors
         WHERE university_id = ? AND code = ? LIMIT 1 FOR UPDATE`,
        [laboratory.universityId, sensor.code],
      );
      if (existing[0] && String(existing[0].laboratoryId) !== String(laboratory.id)) {
        throw new Error(`Kodi ${sensor.code} përdoret nga një laborator tjetër.`);
      }
      const parameters = [
        sensor.name,
        sensor.sensorType,
        sensor.unit,
        sensor.warningMin,
        sensor.warningMax,
        sensor.criticalMin,
        sensor.criticalMax,
      ];
      if (existing[0]) {
        await query(
          connection,
          `UPDATE sensors SET name = ?, sensor_type = ?, unit = ?,
             warning_min = ?, warning_max = ?, critical_min = ?, critical_max = ?,
             status = 'online', sampling_interval_seconds = 60
           WHERE university_id = ? AND laboratory_id = ? AND id = ?`,
          [...parameters, laboratory.universityId, laboratory.id, existing[0].id],
        );
      } else {
        await query(
          connection,
          `INSERT INTO sensors (
             university_id, laboratory_id, name, code, sensor_type, unit,
             status, sampling_interval_seconds, warning_min, warning_max,
             critical_min, critical_max
           ) VALUES (?, ?, ?, ?, ?, ?, 'online', 60, ?, ?, ?, ?)`,
          [
            laboratory.universityId,
            laboratory.id,
            sensor.name,
            sensor.code,
            sensor.sensorType,
            sensor.unit,
            sensor.warningMin,
            sensor.warningMax,
            sensor.criticalMin,
            sensor.criticalMax,
          ],
        );
      }
    }
  });
  return { laboratory, sensors: thesisTestSensors, applied: true };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  loadEnvironmentFile();
  const pool = createDatabasePool(parseEnvironment(process.env));
  try {
    const result = await seedThesisSensors(pool, parseArguments(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
    if (!result.applied) console.log("Vetëm kontroll. Shtoni --apply për t'i ruajtur sensorët.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
