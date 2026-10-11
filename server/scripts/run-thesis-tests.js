import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvironment } from "../src/config/env.js";
import { loadEnvironmentFile } from "../src/config/load-environment.js";
import { createDatabasePool } from "../src/database/pool.js";
import { query, withTransaction } from "../src/database/query.js";
import { evaluateSensorReading } from "../src/modules/alerts/rule-engine.js";
import { thesisTestCases, thesisTestSensors } from "../seeds/thesis-test-sensors.js";

const testEquipmentCode = "CLT-THESIS-DEVICE";

function parseArguments(argv) {
  const valueFor = (name) => argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1).trim();
  const laboratoryCode = valueFor("--laboratory-code");
  const equipmentCode = valueFor("--equipment-code");
  const createTestEquipment = argv.includes("--create-test-equipment");
  if (!laboratoryCode || !/^[A-Za-z0-9_-]+$/.test(laboratoryCode)) {
    throw new Error("Jepni --laboratory-code=KODI_I_LABORATORIT.");
  }
  if (createTestEquipment === Boolean(equipmentCode)) {
    throw new Error("Zgjidhni saktësisht një: --create-test-equipment ose --equipment-code=KODI.");
  }
  if (equipmentCode && !/^[A-Za-z0-9_-]+$/.test(equipmentCode)) {
    throw new Error("Kodi i pajisjes nuk është i vlefshëm.");
  }
  return { laboratoryCode, equipmentCode, createTestEquipment, apply: argv.includes("--apply") };
}

function expectedSensorsMatch(actual) {
  return thesisTestSensors.every((expected) => {
    const sensor = actual.find((item) => item.code === expected.code);
    return sensor && sensor.status === "online" && sensor.sensorType === expected.sensorType &&
      sensor.unit === expected.unit && ["warningMin", "warningMax", "criticalMin", "criticalMax"]
        .every((key) => sensor[key] == null ? expected[key] == null : Number(sensor[key]) === expected[key]);
  });
}

export async function runThesisTests(pool, options) {
  const { laboratoryCode, equipmentCode, createTestEquipment, apply = false } = options;
  if (!laboratoryCode || createTestEquipment === Boolean(equipmentCode)) {
    throw new Error("Kërkohet kodi i laboratorit dhe një zgjedhje e vetme për pajisjen.");
  }
  return withTransaction(pool, async (connection) => {
    const laboratories = await query(connection,
      `SELECT id, university_id AS universityId, name, capacity
       FROM laboratories WHERE code = ? AND deleted_at IS NULL FOR UPDATE`,
      [laboratoryCode]);
    if (laboratories.length !== 1) throw new Error("Laboratori nuk u gjet në mënyrë unike.");
    const lab = laboratories[0];
    if (Number(lab.capacity) !== 25) throw new Error("Kapaciteti duhet të jetë 25 persona.");

    const sensors = await query(connection,
      `SELECT id, code, name, sensor_type AS sensorType, unit, status,
              warning_min AS warningMin, warning_max AS warningMax,
              critical_min AS criticalMin, critical_max AS criticalMax
       FROM sensors WHERE university_id = ? AND laboratory_id = ?
         AND code IN (?, ?, ?, ?) AND deleted_at IS NULL`,
      [lab.universityId, lab.id, ...thesisTestSensors.map((sensor) => sensor.code)]);
    if (!expectedSensorsMatch(sensors)) {
      throw new Error("Sensorët e tezës mungojnë ose pragjet ndryshojnë. Ekzekutoni më parë db:seed-thesis --apply.");
    }

    const activeRuns = await query(connection,
      `SELECT id FROM simulation_runs WHERE university_id = ? AND laboratory_id = ?
       AND status IN ('queued', 'running', 'paused') LIMIT 1`,
      [lab.universityId, lab.id]);
    if (activeRuns.length) throw new Error("Ndalni simulimin aktiv para provës me vlera fikse.");
    const previousTests = await query(connection,
      `SELECT id FROM activity_logs WHERE university_id = ? AND entity_type = 'laboratory'
       AND entity_id = ? AND action = 'thesis_test.completed' LIMIT 1`,
      [lab.universityId, lab.id]);
    if (previousTests.length) throw new Error("Këto gjashtë teste janë regjistruar tashmë për këtë laborator.");
    const activeAlerts = await query(connection,
      `SELECT id FROM alerts WHERE university_id = ? AND laboratory_id = ?
       AND sensor_id IN (?, ?, ?, ?) AND status IN ('new', 'acknowledged', 'in_progress') LIMIT 1`,
      [lab.universityId, lab.id, ...sensors.map((sensor) => sensor.id)]);
    if (activeAlerts.length) throw new Error("Ka alarm aktiv për sensorët e tezës; zgjidheni përpara provës që rezultatet të jenë të veçanta.");

    const administrators = await query(connection,
      `SELECT DISTINCT user_account.id FROM users user_account
       INNER JOIN user_roles user_role ON user_role.user_id = user_account.id
         AND user_role.university_id = user_account.university_id
       INNER JOIN roles role ON role.id = user_role.role_id
       WHERE user_account.university_id = ? AND user_account.status = 'active'
         AND user_account.deleted_at IS NULL AND role.code = 'university_admin'`,
      [lab.universityId]);
    if (!administrators.length) throw new Error("Universiteti nuk ka administrator aktiv për evidencën e testit.");

    let equipment = null;
    if (equipmentCode) {
      const matches = await query(connection,
        `SELECT id, code, status FROM equipment WHERE university_id = ? AND laboratory_id = ?
         AND code = ? AND deleted_at IS NULL FOR UPDATE`,
        [lab.universityId, lab.id, equipmentCode]);
      if (matches.length !== 1 || matches[0].status !== "active") {
        throw new Error("Pajisja e zgjedhur duhet të ekzistojë dhe të jetë active.");
      }
      equipment = matches[0];
    } else {
      const matches = await query(connection,
        `SELECT id, code, status, laboratory_id AS laboratoryId
         FROM equipment WHERE university_id = ? AND code = ?
         AND deleted_at IS NULL FOR UPDATE`,
        [lab.universityId, testEquipmentCode]);
      if (matches.length && String(matches[0].laboratoryId ?? lab.id) !== String(lab.id)) {
        throw new Error("Kodi i pajisjes testuese është i zënë.");
      }
      equipment = matches[0] ?? null;
    }

    const preview = {
      laboratory: { id: String(lab.id), code: laboratoryCode, capacity: Number(lab.capacity) },
      equipment: equipmentCode ?? testEquipmentCode,
      cases: thesisTestCases.map((item) => ({ key: item.key, values: item.values, expected: item.expected })),
      applied: false,
    };
    if (!apply) return preview;

    if (createTestEquipment && !equipment) {
      const inserted = await query(connection,
        `INSERT INTO equipment (university_id, laboratory_id, name, code, type,
          status, energy_rating_watts, health_score)
         VALUES (?, ?, 'Pajisje testuese e tezës', ?, 'thesis_test_device', 'active', 500, 100)`,
        [lab.universityId, lab.id, testEquipmentCode]);
      equipment = { id: inserted.insertId, code: testEquipmentCode, status: "active" };
    } else if (createTestEquipment && equipment.status !== "active") {
      throw new Error("Pajisja testuese ekziston, por nuk është active.");
    }

    const byType = new Map(sensors.map((sensor) => [sensor.sensorType, sensor]));
    const results = [];
    for (const item of thesisTestCases) {
      const readings = [];
      const alarms = [];
      for (const [type, value] of Object.entries(item.values)) {
        const sensor = byType.get(type);
        const inserted = await query(connection,
          `INSERT INTO sensor_readings (university_id, laboratory_id, sensor_id,
            value, recorded_at, source)
           VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), 'imported')`,
          [lab.universityId, lab.id, sensor.id, value]);
        readings.push({ sensorId: String(sensor.id), readingId: String(inserted.insertId), type, value });
        const candidate = evaluateSensorReading(sensor, { value });
        if (!candidate) continue;
        const alert = await query(connection,
          `INSERT INTO alerts (university_id, laboratory_id, sensor_id, equipment_id,
            category, severity, title, description, status, source, deduplication_key, last_triggered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', 'manual', ?, UTC_TIMESTAMP(3))`,
          [lab.universityId, lab.id, sensor.id, null, candidate.category,
            candidate.severity, candidate.title, candidate.description,
            `thesis:${sensor.id}:threshold`]);
        alarms.push({ alertId: String(alert.insertId), severity: candidate.severity });
        for (const administrator of administrators) {
          await query(connection,
            `INSERT INTO notifications (university_id, user_id, alert_id, type, title, message)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [lab.universityId, administrator.id, alert.insertId,
              `alert_${candidate.severity}`, candidate.title, candidate.description]);
        }
      }
      if (item.key === "equipment_fault") {
        await query(connection,
          `UPDATE equipment SET status = 'fault' WHERE university_id = ? AND laboratory_id = ? AND id = ?`,
          [lab.universityId, lab.id, equipment.id]);
      }
      const actual = item.key === "equipment_fault"
        ? "Problem state only"
        : alarms.length ? alarms[0].severity === "critical" ? "Critical" : "Warning" : "Normal";
      if (actual !== item.expected) throw new Error(`Testi ${item.key}: pritej ${item.expected}, u mor ${actual}.`);
      results.push({ scenario: item.key, expected: item.expected, actual,
        readings, alarms, equipmentId: item.key === "equipment_fault" ? String(equipment.id) : null });
    }
    const log = await query(connection,
      `INSERT INTO activity_logs (university_id, user_id, action, entity_type, entity_id,
        description, metadata_json)
       VALUES (?, ?, 'thesis_test.completed', 'laboratory', ?, ?, ?)`,
      [lab.universityId, administrators[0].id, lab.id,
        "U ekzekutuan gjashtë testet funksionale të tezës me lexime fikse të importuara.",
        JSON.stringify({ laboratoryCode, equipmentCode: equipment.code, results })]);
    return { ...preview, applied: true, activityLogId: String(log.insertId), results };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  loadEnvironmentFile();
  const pool = createDatabasePool(parseEnvironment(process.env));
  try {
    const result = await runThesisTests(pool, parseArguments(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
    if (!result.applied) console.log("Vetëm kontroll. Shtoni --apply për ruajtje në DB.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
