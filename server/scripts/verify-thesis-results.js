import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { parseEnvironment } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query } from "../src/database/query.js";

const cases = [
  { runId: 9, name: "normal", type: null, value: null, severity: null },
  { runId: 10, name: "high_temperature", type: "temperature", value: 29, severity: "warning" },
  { runId: 11, name: "high_humidity", type: "humidity", value: 70, severity: "warning" },
  { runId: 12, name: "overcapacity", type: "occupancy", value: 30, severity: "critical" },
  { runId: 13, name: "high_power", type: "power", value: 7000, severity: "critical" },
  { runId: 14, name: "equipment_fault", type: null, value: null, severity: null },
];
loadEnvironmentFile();
const pool = createDatabasePool(parseEnvironment(process.env));
try {
  const results = [];
  for (const item of cases) {
    const [run] = await query(pool, `SELECT id, status, started_at AS startedAt, ended_at AS endedAt
      FROM simulation_runs WHERE id = ? AND university_id = 6 AND laboratory_id = 5`, [item.runId]);
    const readings = await query(pool, `SELECT r.id, s.code, s.sensor_type AS type, r.value, r.source,
      r.recorded_at AS recordedAt FROM sensor_readings r JOIN sensors s ON s.id = r.sensor_id
      WHERE r.university_id = 6 AND r.laboratory_id = 5 AND r.simulation_run_id = ?
      AND s.code IN ('CLT-THESIS-TEMP','CLT-THESIS-HUM','CLT-THESIS-OCC','CLT-THESIS-POWER')`, [item.runId]);
    const events = await query(pool, `SELECT event_data_json AS data FROM simulation_run_events
      WHERE university_id = 6 AND simulation_run_id = ? AND event_type = 'alert_generated'`, [item.runId]);
    const alertIds = events.map(({ data }) => (typeof data === "string" ? JSON.parse(data) : data).alertId);
    const alerts = alertIds.length ? await query(pool, `SELECT id, severity, status, source,
      created_at AS createdAt FROM alerts WHERE university_id = 6 AND id IN (${alertIds.map(() => "?").join(",")})`, alertIds) : [];
    const notifications = alertIds.length ? await query(pool,
      `SELECT id, alert_id AS alertId, type FROM notifications WHERE university_id = 6
       AND alert_id IN (${alertIds.map(() => "?").join(",")})`, alertIds) : [];
    const expectedValues = { temperature: 23, humidity: 45, occupancy: 10, power: 2000 };
    if (item.type) expectedValues[item.type] = item.value;
    const valuesMatch = readings.length === 4 && Object.entries(expectedValues).every(([type, value]) =>
      readings.some((reading) => reading.type === type && Number(reading.value) === value && reading.source === "simulated"));
    const alertMatch = item.severity ? alerts.length === 1 && alerts[0].severity === item.severity &&
      notifications.length > 0 : alerts.length === 0;
    results.push({ scenario: item.name, runId: item.runId, runStatus: run?.status,
      readings, alerts, notifications, databaseVerified: run?.status === "stopped" && valuesMatch && alertMatch });
  }
  const [equipment] = await query(pool, `SELECT id, status FROM equipment
    WHERE university_id = 6 AND laboratory_id = 5 AND code = 'CLT-THESIS-DEVICE'`);
  results[5].equipment = equipment;
  results[5].databaseVerified &&= equipment?.status === "fault";
  console.log(JSON.stringify({ laboratoryId: 5, equipment, results }, null, 2));
} finally { await pool.end(); }
