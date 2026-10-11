import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { parseEnvironment } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query } from "../src/database/query.js";
import { createSimulatorRepository } from "../src/modules/simulator/repository.js";
import { evaluateSimulationReadings } from "../src/modules/alerts/rule-engine.js";
import { thesisTestCases, thesisTestSensors } from "../seeds/thesis-test-sensors.js";

const context = { universityId: "6", laboratoryId: "5", userId: "10", restrictToAssignments: false };
const scenarioId = "5";
const equipmentCode = "CLT-THESIS-DEVICE";
const normalValues = { temperature: 23, humidity: 45, occupancy: 10, power: 2000 };

loadEnvironmentFile();
const pool = createDatabasePool(parseEnvironment(process.env));
const repository = createSimulatorRepository(pool);

async function main() {
  const resumeFrom = process.argv.includes("--resume-from=3") ? 3 : 1;
  const [laboratory] = await query(pool,
    `SELECT id, university_id AS universityId, code, capacity FROM laboratories
     WHERE id = 5 AND university_id = 6 AND deleted_at IS NULL`);
  if (!laboratory || laboratory.code !== "LAB-AUT-01" || Number(laboratory.capacity) !== 25) {
    throw new Error("Laboratori nuk është gati për gjashtë provat.");
  }
  const sensors = await query(pool,
    `SELECT id, code, name, sensor_type AS sensorType, unit, status,
       equipment_id AS equipmentId, warning_min AS warningMin, warning_max AS warningMax,
       critical_min AS criticalMin, critical_max AS criticalMax
     FROM sensors WHERE university_id = 6 AND laboratory_id = 5 AND deleted_at IS NULL
       AND code IN (?, ?, ?, ?)`, thesisTestSensors.map(({ code }) => code));
  if (sensors.length !== 4 || thesisTestSensors.some((expected) => {
    const sensor = sensors.find(({ code }) => code === expected.code);
    return !sensor || sensor.status !== "online" || sensor.sensorType !== expected.sensorType ||
      ["warningMin", "warningMax", "criticalMin", "criticalMax"].some((field) =>
        sensor[field] == null ? expected[field] != null : Number(sensor[field]) !== expected[field]);
  })) throw new Error("Sensorët testues nuk përputhen me konfigurimin e tezës.");
  const activeRuns = await query(pool,
    `SELECT id FROM simulation_runs WHERE university_id = 6 AND laboratory_id = 5
       AND status IN ('queued','running','paused')`);
  if (activeRuns.length) throw new Error("Ekziston simulim aktiv; nuk përzihen provat.");
  const previous = await query(pool,
    `SELECT id FROM activity_logs WHERE university_id = 6 AND entity_type = 'laboratory'
       AND entity_id = 5 AND action = 'thesis_test.completed' LIMIT 1`);
  if (previous.length) throw new Error("Provat janë regjistruar më parë.");
  const preexistingAlerts = await query(pool,
    `SELECT id FROM alerts WHERE university_id = 6 AND laboratory_id = 5
       AND sensor_id IN (?, ?, ?, ?) AND status IN ('new','acknowledged','in_progress')`,
    sensors.map(({ id }) => id));
  if (preexistingAlerts.length && resumeFrom === 1) throw new Error("Sensorët testues kanë alarm aktiv para provës.");
  let [equipment] = await query(pool,
    `SELECT id, code, status FROM equipment WHERE university_id = 6 AND code = ? AND deleted_at IS NULL`,
    [equipmentCode]);
  if (equipment && equipment.status !== "active") throw new Error("Pajisja testuese nuk është active.");
  if (!process.argv.includes("--apply")) {
    return { applied: false, laboratoryId: 5, sensorIds: sensors.map(({ id }) => id),
      equipmentId: equipment?.id ?? null, scenarios: thesisTestCases.slice(resumeFrom - 1).map(({ key }) => key) };
  }
  if (!equipment) {
    const inserted = await query(pool,
      `INSERT INTO equipment (university_id, laboratory_id, name, code, type,
         status, energy_rating_watts, health_score)
       VALUES (6, 5, 'Pajisje testuese', ?, 'thesis_test_device', 'active', 7000, 100)`,
      [equipmentCode]);
    equipment = { id: inserted.insertId, code: equipmentCode, status: "active" };
  }
  const results = [];
  for (const item of thesisTestCases.slice(resumeFrom - 1)) {
    const values = { ...normalValues, ...item.values };
    const started = await repository.start({ ...context, scenarioId,
      samplingIntervalSeconds: 3600, overrides: {} });
    if (!started?.id) throw new Error(`Simulimi nuk nisi për ${item.key}.`);
    const recordedAt = new Date().toISOString();
    const readings = sensors.map((sensor) => ({ sensorId: String(sensor.id),
      sensorType: sensor.sensorType, unit: sensor.unit, value: values[sensor.sensorType],
      recordedAt, source: "simulated" }));
    const candidates = evaluateSimulationReadings(sensors, readings);
    const persisted = await repository.persistStep({ ...context, runId: started.id,
      readings, energyReadings: [], generatorState: { tick: 1, values },
      event: { type: "thesis_controlled_input", scenario: item.key },
      recordedAt: recordedAt.replace("T", " ").replace("Z", ""),
      alertCandidates: candidates });
    if (!persisted?.persisted) throw new Error(`Leximet nuk u ruajtën për ${item.key}.`);
    if (item.key === "equipment_fault") {
      await query(pool, `UPDATE equipment SET status = 'fault' WHERE id = ? AND university_id = 6
        AND laboratory_id = 5 AND status = 'active'`, [equipment.id]);
    }
    const storedReadings = await query(pool,
      `SELECT id, sensor_id AS sensorId, value, source, simulation_run_id AS runId,
         recorded_at AS recordedAt FROM sensor_readings
       WHERE university_id = 6 AND laboratory_id = 5 AND simulation_run_id = ? ORDER BY sensor_id`,
      [started.id]);
    const events = await query(pool,
      `SELECT event_data_json AS data FROM simulation_run_events WHERE university_id = 6
         AND simulation_run_id = ? AND event_type = 'alert_generated'`, [started.id]);
    const alertIds = events.map(({ data }) => (typeof data === "string" ? JSON.parse(data) : data).alertId);
    const alerts = alertIds.length ? await query(pool,
      `SELECT id, sensor_id AS sensorId, severity, status, source, created_at AS createdAt
       FROM alerts WHERE university_id = 6 AND id IN (${alertIds.map(() => "?").join(",")})`, alertIds) : [];
    const notifications = alertIds.length ? await query(pool,
      `SELECT id, alert_id AS alertId, type FROM notifications WHERE university_id = 6
       AND alert_id IN (${alertIds.map(() => "?").join(",")})`, alertIds) : [];
    const [storedEquipment] = await query(pool,
      `SELECT id, status FROM equipment WHERE id = ? AND university_id = 6`, [equipment.id]);
    const actual = item.key === "equipment_fault" ?
      (storedEquipment?.status === "fault" ? "Problem state only" : "No problem state") :
      alerts.some(({ severity }) => severity === "critical") ? "Critical" :
      alerts.some(({ severity }) => severity === "warning") ? "Warning" : "Normal";
    const readingsMatch = storedReadings.length === readings.length && readings.every((reading) =>
      storedReadings.some((stored) => String(stored.sensorId) === reading.sensorId &&
        Number(stored.value) === reading.value && String(stored.runId) === started.id));
    const passed = readingsMatch && actual === item.expected &&
      (alerts.length === 0 || notifications.length > 0);
    const stopped = await repository.transition({ ...context, action: "stop" });
    if (stopped.id !== started.id || stopped.status !== "stopped") throw new Error("Simulimi nuk u ndal.");
    results.push({ scenario: item.key, input: values, expected: item.expected, actual,
      status: passed ? "PASSED" : "FAILED", runId: started.id, recordedAt,
      readings: storedReadings, alerts, notifications, equipment: item.key === "equipment_fault" ? storedEquipment : null });
    if (!passed) break;
  }
  await query(pool,
    `INSERT INTO activity_logs (university_id, user_id, action, entity_type, entity_id,
      description, metadata_json) VALUES (6, 10, 'thesis_test.completed', 'laboratory', 5, ?, ?)`,
    ["Prova funksionale me lexime të kontrolluara në rrjedhën e simulimit.",
      JSON.stringify({ equipmentId: equipment.id, results })]);
  return { applied: true, laboratoryId: 5, equipmentId: equipment.id, results };
}

try {
  console.log(JSON.stringify(await main(), null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
