import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { parseEnvironment } from "../src/config/env.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query, withTransaction } from "../src/database/query.js";
import { thesisTestSensors } from "../seeds/thesis-test-sensors.js";

loadEnvironmentFile();
const pool = createDatabasePool(parseEnvironment(process.env));
try {
  const changed = await withTransaction(pool, async (connection) => {
    const sensors = await query(connection, `SELECT id, code FROM sensors
      WHERE university_id = 6 AND laboratory_id = 5 AND id IN (11,12,13,14) FOR UPDATE`);
    const alerts = await query(connection, `SELECT id, sensor_id AS sensorId, title, description
      FROM alerts WHERE university_id = 6 AND laboratory_id = 5 AND id IN (4,5,6,7) FOR UPDATE`);
    const equipment = await query(connection, `SELECT id, code FROM equipment
      WHERE university_id = 6 AND laboratory_id = 5 AND id = 13 FOR UPDATE`);
    if (sensors.length !== 4 || alerts.length !== 4 || equipment.length !== 1 ||
        equipment[0].code !== "CLT-THESIS-DEVICE" ||
        thesisTestSensors.some((expected) => !sensors.some(({ code }) => code === expected.code)) ||
        alerts.some(({ sensorId }) => !sensors.some(({ id }) => String(id) === String(sensorId)))) {
      throw new Error("ID-të e të dhënave testuese nuk përputhen; asgjë nuk u ndryshua.");
    }
    for (const sensor of sensors) {
      const name = thesisTestSensors.find(({ code }) => code === sensor.code).name;
      await query(connection, `UPDATE sensors SET name = ? WHERE university_id = 6 AND id = ?`, [name, sensor.id]);
      const alert = alerts.find(({ sensorId }) => String(sensorId) === String(sensor.id));
      const prefix = alert.title.startsWith("Prag kritik:") ? "Prag kritik:" : "Paralajmërim:";
      const oldName = alert.title.slice(prefix.length).trim();
      await query(connection, `UPDATE alerts SET title = ?, description = ?
        WHERE university_id = 6 AND id = ?`,
        [`${prefix} ${name}`, alert.description.replaceAll(oldName, name), alert.id]);
    }
    await query(connection, `UPDATE equipment SET name = 'Pajisje testuese'
      WHERE university_id = 6 AND id = 13`);
    return { sensorIds: sensors.map(({ id }) => id), alertIds: alerts.map(({ id }) => id), equipmentId: 13 };
  });
  const verified = await query(pool, `SELECT id, title, description FROM alerts
    WHERE university_id = 6 AND laboratory_id = 5 AND id IN (4,5,6,7) ORDER BY id`);
  console.log(JSON.stringify({ changed, alerts: verified }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
