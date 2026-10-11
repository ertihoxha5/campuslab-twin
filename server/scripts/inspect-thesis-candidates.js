import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { parseEnvironment } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";

loadEnvironmentFile();
const pool = createDatabasePool(parseEnvironment(process.env));
try {
  const [rows] = await pool.query(`
    SELECT l.id, l.code, l.name, l.capacity, u.name AS university,
           (SELECT COUNT(*) FROM sensors s WHERE s.laboratory_id = l.id AND s.deleted_at IS NULL) AS sensors,
           (SELECT COUNT(*) FROM equipment e WHERE e.laboratory_id = l.id AND e.deleted_at IS NULL) AS equipment
    FROM laboratories l JOIN universities u ON u.id = l.university_id
    WHERE l.deleted_at IS NULL ORDER BY l.id DESC LIMIT 30`);
  console.log(JSON.stringify(rows, null, 2));
  const [sensors] = await pool.query(`
    SELECT s.id, s.laboratory_id AS laboratoryId, s.code, s.sensor_type AS type,
           s.warning_min AS warningMin, s.warning_max AS warningMax,
           s.critical_min AS criticalMin, s.critical_max AS criticalMax
    FROM sensors s WHERE s.deleted_at IS NULL ORDER BY s.laboratory_id, s.id`);
  console.log(JSON.stringify(sensors, null, 2));
  const [scenarios] = await pool.query(`SELECT id, laboratory_id AS laboratoryId, name, scenario_type AS type, status FROM simulation_scenarios WHERE laboratory_id = 5`);
  console.log(JSON.stringify(scenarios, null, 2));
  const [testContext] = await pool.query(`
    SELECT l.university_id AS universityId,
           (SELECT COUNT(*) FROM simulation_runs r WHERE r.laboratory_id = l.id AND r.status IN ('queued','running','paused')) AS activeRuns,
           (SELECT MIN(u.id) FROM users u JOIN user_roles ur ON ur.user_id = u.id AND ur.university_id = u.university_id JOIN roles role ON role.id = ur.role_id WHERE u.university_id = l.university_id AND u.status = 'active' AND role.code = 'university_admin') AS adminId
    FROM laboratories l WHERE l.id = 5`);
  console.log(JSON.stringify(testContext, null, 2));
  const [activeRuns] = await pool.query(`SELECT id, status, started_at AS startedAt FROM simulation_runs WHERE laboratory_id = 5 AND status IN ('queued','running','paused')`);
  console.log(JSON.stringify(activeRuns, null, 2));
  const [testEvents] = await pool.query(`SELECT simulation_run_id AS runId, event_type AS type, event_data_json AS data FROM simulation_run_events WHERE university_id = 6 AND simulation_run_id >= 9 ORDER BY id`);
  console.log(JSON.stringify(testEvents, null, 2));
  const [alertsNow] = await pool.query(`SELECT id, sensor_id AS sensorId, severity, source, status, description, last_triggered_at AS lastTriggeredAt FROM alerts WHERE university_id = 6 AND laboratory_id = 5 AND id IN (4,5,6,7)`);
  console.log(JSON.stringify(alertsNow, null, 2));
  const [fixtureRecent] = await pool.query(`SELECT r.id, r.sensor_id AS sensorId, r.value, r.simulation_run_id AS runId, r.recorded_at AS recordedAt FROM sensor_readings r WHERE r.university_id = 6 AND r.laboratory_id = 5 AND r.sensor_id IN (11,12,13,14) ORDER BY r.id DESC LIMIT 12`);
  console.log(JSON.stringify(fixtureRecent, null, 2));
} finally {
  await pool.end();
}
