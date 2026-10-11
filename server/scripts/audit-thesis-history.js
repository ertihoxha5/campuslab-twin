import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { parseEnvironment } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query } from "../src/database/query.js";

loadEnvironmentFile();
const pool = createDatabasePool(parseEnvironment(process.env));
try {
  const [runs, events, alerts, notifications, logs, sensors, equipment, originalSensors] = await Promise.all([
    query(pool, `SELECT id, status, scenario_id AS scenarioId, started_at AS startedAt,
      ended_at AS endedAt, result_json AS result FROM simulation_runs
      WHERE university_id = 6 AND laboratory_id = 5 AND id >= 8 ORDER BY id`),
    query(pool, `SELECT id, simulation_run_id AS runId, event_type AS type,
      event_data_json AS data, occurred_at AS occurredAt FROM simulation_run_events
      WHERE university_id = 6 AND simulation_run_id >= 8
      AND event_type IN ('started','alert_generated','stopped','failed') ORDER BY id`),
    query(pool, `SELECT id, sensor_id AS sensorId, severity, status, title, description,
      created_at AS createdAt, last_triggered_at AS lastTriggeredAt,
      updated_at AS updatedAt FROM alerts
      WHERE university_id = 6 AND laboratory_id = 5 AND id IN (4,5,6,7) ORDER BY id`),
    query(pool, `SELECT alert_id AS alertId, type, COUNT(*) AS count
      FROM notifications WHERE university_id = 6 AND alert_id IN (4,5,6,7)
      GROUP BY alert_id, type ORDER BY alert_id, type`),
    query(pool, `SELECT id, action, entity_type AS entityType, entity_id AS entityId,
      created_at AS createdAt, metadata_json AS metadata FROM activity_logs
      WHERE university_id = 6 AND (action = 'thesis_test.completed'
      OR (entity_type = 'simulation_run' AND entity_id IN (8,9,10,11,12,13,14,15)))
      ORDER BY id`),
    query(pool, `SELECT id, code, name, warning_min AS warningMin, warning_max AS warningMax,
      critical_min AS criticalMin, critical_max AS criticalMax FROM sensors
      WHERE university_id = 6 AND laboratory_id = 5 AND id IN (11,12,13,14) ORDER BY id`),
    query(pool, `SELECT id, code, name, status FROM equipment
      WHERE university_id = 6 AND laboratory_id = 5 AND id = 13`),
    query(pool, `SELECT id, code, sensor_type AS sensorType, warning_min AS warningMin,
      warning_max AS warningMax, critical_min AS criticalMin, critical_max AS criticalMax
      FROM sensors WHERE university_id = 6 AND laboratory_id = 5 AND id IN (5,6,7,8) ORDER BY id`),
  ]);
  console.log(JSON.stringify({ runs: runs.map(({ result, ...run }) => ({ ...run,
    resultSummary: typeof result === "string" ? JSON.parse(result)?.lastEvent : result?.lastEvent })),
    events, alerts, notifications, logs, sensors, equipment, originalSensors }, null, 2));
} finally {
  await pool.end();
}
