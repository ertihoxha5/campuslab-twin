import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, withTransaction } from "../../database/query.js";
import { AppError } from "../../utils/app-error.js";
import { requiresLaboratoryAssignment } from "../../middleware/require-laboratory-access.js";
import { evaluateSimulationReadings } from "../alerts/rule-engine.js";
import { thesisTestCases, thesisTestSensors } from "../../../seeds/thesis-test-sensors.js";

const equipmentCode = "CLT-THESIS-DEVICE";
const baseline = Object.freeze({ temperature: 23, humidity: 45, occupancy: 10, power: 2000 });
const names = Object.freeze({
  normal: "Gjendja normale",
  high_temperature: "Temperatura e lartë",
  high_humidity: "Lagështia e lartë",
  overcapacity: "Tejkalimi i pranisë",
  high_power: "Fuqia e lartë",
  equipment_fault: "Defekt në pajisje",
});
const expectedText = Object.freeze({
  Normal: "Pa alarm; pajisja aktive",
  Warning: "Alarm paralajmërues",
  Critical: "Alarm kritik",
  "Problem state only": "Pajisja në gjendje fault",
});
const actualText = Object.freeze({
  Normal: "Pa alarm; pajisja aktive",
  Warning: "Alarm paralajmërues",
  Critical: "Alarm kritik",
  "Problem state only": "Pajisja në gjendje fault",
  "No problem state": "Pajisja nuk është në gjendje fault",
});
const docsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../docs/thesis-results");

function conflict(message) {
  return new AppError({ status: 409, code: "THESIS_TEST_CONFLICT", message });
}

function notFound() {
  return new AppError({ status: 404, code: "NOT_FOUND", message: "Laboratori testues nuk u gjet." });
}

function repositoryContext(context, laboratoryId) {
  return {
    universityId: context.universityId,
    laboratoryId,
    userId: context.userId,
    restrictToAssignments: requiresLaboratoryAssignment(context),
    ipAddress: context.ipAddress,
  };
}

function normalized(row) {
  return {
    id: String(row.id), batchId: row.batchId, scenario: row.scenarioKey,
    scenarioName: row.scenarioName,
    input: typeof row.input === "string" ? JSON.parse(row.input) : row.input,
    expectedResult: row.expectedResult, actualResult: row.actualResult,
    expectedLevel: row.expectedLevel, actualLevel: row.actualLevel,
    status: row.status, runId: row.runId == null ? null : String(row.runId),
    alertId: row.alertId == null ? null : String(row.alertId),
    executedAt: row.executedAt,
  };
}

function summarize(results) {
  const passed = results.filter((item) => item.status === "PASS").length;
  return { passed, failed: results.length - passed, total: results.length,
    allPassed: results.length === thesisTestCases.length && passed === thesisTestCases.length };
}

function inputLabel(item) {
  if (item.scenario === "equipment_fault") return "status = fault";
  if (item.scenario === "high_temperature") return "29 °C";
  if (item.scenario === "high_humidity") return "70 %";
  if (item.scenario === "overcapacity") return "30 persona";
  if (item.scenario === "high_power") return "7 kW";
  return "23 °C, 45 %, 10 persona, 2 kW, active";
}

async function exportResults(batchId, laboratoryCode, results) {
  // Only a completed, real batch is exported; earlier thesis evidence is left untouched.
  if (results.length !== thesisTestCases.length) return;
  await mkdir(docsDirectory, { recursive: true });
  const summary = summarize(results);
  const payload = { title: "CampusLab Twin — Testimi funksional", batchId,
    laboratoryCode, generatedAt: new Date().toISOString(), summary, results };
  const header = "| Skenari | Vlera e simuluar | Rezultati i pritur | Rezultati i arritur | Niveli | Statusi |";
  const divider = "| --- | --- | --- | --- | --- | --- |";
  const lines = results.map((item) =>
    `| ${item.scenarioName} | ${inputLabel(item)} | ${item.expectedResult} | ${item.actualResult} | ${item.actualLevel} | ${item.status} |`);
  const markdown = ["# Rezultatet përfundimtare — Kapitulli 6", "",
    `Laboratori: ${laboratoryCode} · Batch: ${batchId}`, "",
    header, divider, ...lines, "",
    `Rezultati përfundimtar: ${summary.passed} / ${summary.total} PASS; ${summary.failed} / ${summary.total} FAIL.`,
    ...(summary.allPassed ? ["", "Të gjashtë skenarët prodhuan rezultatin e pritur."] : []), "",
    "Vlerësimi bazohet në leximet, alarmet dhe statusin e pajisjes të ruajtur gjatë ekzekutimit. Nuk është test automatik i paraqitjes vizuale në shfletues.", ""].join("\n");
  await Promise.all([
    writeFile(path.join(docsDirectory, "scenario-results-final.json"), JSON.stringify(payload, null, 2) + "\n", "utf8"),
    writeFile(path.join(docsDirectory, "chapter-6-final-results.md"), markdown, "utf8"),
  ]);
}

export function createThesisFunctionalService({ pool, simulatorRepository, realtimePublisher }) {
  async function accessibleLaboratory(laboratoryId, context) {
    if (!/^[1-9]\d*$/.test(String(laboratoryId))) throw notFound();
    const rows = await query(pool, `SELECT lab.id, lab.code, lab.capacity
      FROM laboratories lab JOIN universities university ON university.id = lab.university_id
      WHERE lab.id = ? AND lab.university_id = ? AND lab.deleted_at IS NULL
        AND lab.status = 'active' AND lab.code = 'LAB-AUT-01' AND university.acronym = 'UBT'
        AND (? = 0 OR EXISTS (SELECT 1 FROM user_laboratory_assignments assignment
          WHERE assignment.university_id = lab.university_id
            AND assignment.laboratory_id = lab.id AND assignment.user_id = ?)) LIMIT 1`,
    [laboratoryId, context.universityId, requiresLaboratoryAssignment(context) ? 1 : 0, context.userId]);
    if (!rows[0]) throw notFound();
    if (Number(rows[0].capacity) !== 25) throw conflict("Kapaciteti i LAB-AUT-01 duhet të jetë 25 persona për testin e tezës.");
    return rows[0];
  }

  async function latest(laboratoryId, context) {
    const laboratory = await accessibleLaboratory(laboratoryId, context);
    const batches = await query(pool, `SELECT batch_id AS batchId FROM thesis_functional_results
      WHERE university_id = ? AND laboratory_id = ? ORDER BY id DESC LIMIT 1`,
    [context.universityId, laboratory.id]);
    if (!batches.length) return { laboratoryCode: laboratory.code, batchId: null, results: [], summary: summarize([]) };
    const rows = await query(pool, `SELECT id, batch_id AS batchId, scenario_key AS scenarioKey,
      scenario_name AS scenarioName, input_json AS input, expected_result AS expectedResult,
      actual_result AS actualResult, expected_level AS expectedLevel,
      actual_level AS actualLevel, status, simulation_run_id AS runId,
      alert_id AS alertId, executed_at AS executedAt
      FROM thesis_functional_results WHERE university_id = ? AND laboratory_id = ?
        AND batch_id = ? ORDER BY id`, [context.universityId, laboratory.id, batches[0].batchId]);
    const results = rows.map(normalized);
    return { laboratoryCode: laboratory.code, batchId: batches[0].batchId, results, summary: summarize(results) };
  }

  async function prepare(laboratory, context) {
    const active = await query(pool, `SELECT id FROM simulation_runs WHERE university_id = ?
      AND laboratory_id = ? AND status IN ('queued','running','paused') LIMIT 1`,
    [context.universityId, laboratory.id]);
    if (active.length) throw conflict("Ndalo simulimin aktiv të këtij laboratori para testimit funksional.");
    const scenarios = await query(pool, `SELECT id FROM simulation_scenarios WHERE university_id = ?
      AND laboratory_id = ? AND status = 'active' ORDER BY id LIMIT 1`,
    [context.universityId, laboratory.id]);
    if (!scenarios.length) throw conflict("Laboratori nuk ka skenar simulimi aktiv.");
    await withTransaction(pool, async (connection) => {
      for (const fixture of thesisTestSensors) {
        const found = await query(connection, `SELECT id, laboratory_id AS laboratoryId FROM sensors
          WHERE university_id = ? AND code = ? LIMIT 1 FOR UPDATE`, [context.universityId, fixture.code]);
        if (found[0] && String(found[0].laboratoryId) !== String(laboratory.id)) {
          throw conflict(`Kodi i sensorit ${fixture.code} përdoret nga laborator tjetër.`);
        }
        const values = [fixture.name, fixture.sensorType, fixture.unit,
          fixture.warningMin, fixture.warningMax, fixture.criticalMin, fixture.criticalMax];
        if (found[0]) await query(connection, `UPDATE sensors SET name = ?, sensor_type = ?, unit = ?,
          warning_min = ?, warning_max = ?, critical_min = ?, critical_max = ?,
          status = 'online', sampling_interval_seconds = 60, deleted_at = NULL
          WHERE id = ? AND university_id = ? AND laboratory_id = ?`,
        [...values, found[0].id, context.universityId, laboratory.id]);
        else await query(connection, `INSERT INTO sensors (university_id, laboratory_id, name, code,
          sensor_type, unit, status, sampling_interval_seconds,
          warning_min, warning_max, critical_min, critical_max)
          VALUES (?, ?, ?, ?, ?, ?, 'online', 60, ?, ?, ?, ?)`,
        [context.universityId, laboratory.id, fixture.name, fixture.code, fixture.sensorType,
          fixture.unit, fixture.warningMin, fixture.warningMax, fixture.criticalMin, fixture.criticalMax]);
      }
      const equipment = await query(connection, `SELECT id, laboratory_id AS laboratoryId FROM equipment WHERE university_id = ?
        AND code = ? LIMIT 1 FOR UPDATE`, [context.universityId, equipmentCode]);
      if (equipment[0] && String(equipment[0].laboratoryId) !== String(laboratory.id)) {
        throw conflict("Pajisja testuese është e lidhur me laborator tjetër.");
      }
      if (equipment.length) await query(connection, `UPDATE equipment SET status = 'active'
        , deleted_at = NULL
        WHERE id = ? AND university_id = ? AND laboratory_id = ?`,
      [equipment[0].id, context.universityId, laboratory.id]);
      else await query(connection, `INSERT INTO equipment (university_id, laboratory_id, name, code,
        type, status, energy_rating_watts, health_score)
        VALUES (?, ?, 'Pajisje testuese', ?, 'thesis_test_device', 'active', 7000, 100)`,
      [context.universityId, laboratory.id, equipmentCode]);
    });
    const sensors = await query(pool, `SELECT id, code, name, sensor_type AS sensorType, unit,
      equipment_id AS equipmentId, warning_min AS warningMin, warning_max AS warningMax,
      critical_min AS criticalMin, critical_max AS criticalMax FROM sensors
      WHERE university_id = ? AND laboratory_id = ? AND deleted_at IS NULL
        AND code IN (?, ?, ?, ?)`, [context.universityId, laboratory.id, ...thesisTestSensors.map((sensor) => sensor.code)]);
    const [equipment] = await query(pool, `SELECT id, status FROM equipment WHERE university_id = ?
      AND laboratory_id = ? AND code = ? AND deleted_at IS NULL LIMIT 1`,
    [context.universityId, laboratory.id, equipmentCode]);
    if (sensors.length !== 4 || !equipment) throw conflict("Përgatitja e sensorëve ose pajisjes testuese dështoi.");
    return { sensors, equipment, scenarioId: String(scenarios[0].id) };
  }

  async function execute(laboratoryId, context) {
    const laboratory = await accessibleLaboratory(laboratoryId, context);
    const lockConnection = await pool.getConnection();
    const lockName = `campuslab:thesis:${context.universityId}:${laboratory.id}`;
    let locked = false;
    try {
      const lock = await query(lockConnection, "SELECT GET_LOCK(?, 0) AS acquired", [lockName]);
      locked = Number(lock[0]?.acquired) === 1;
      if (!locked) throw conflict("Testimi funksional është duke u ekzekutuar. Prisni përfundimin.");
      const fixture = await prepare(laboratory, context);
      const batchId = randomUUID();
      const results = [];
      const simulationContext = repositoryContext(context, laboratory.id);
      for (const item of thesisTestCases) {
        const values = { ...baseline, ...item.values };
        const run = await simulatorRepository.start({ ...simulationContext,
          scenarioId: fixture.scenarioId, samplingIntervalSeconds: 3600, overrides: {} });
        if (!run?.id) throw conflict("Simulimi nuk mund të nisej.");
        try {
          const recordedAt = new Date().toISOString();
          const readings = fixture.sensors.map((sensor) => ({
            sensorId: String(sensor.id), sensorType: sensor.sensorType, unit: sensor.unit,
            value: values[sensor.sensorType], recordedAt, source: "simulated",
          }));
          const persisted = await simulatorRepository.persistStep({ ...simulationContext,
            runId: run.id, readings, energyReadings: [], generatorState: { tick: 1, values },
            event: { type: "thesis_controlled_input", scenario: item.key },
            recordedAt: recordedAt.slice(0, 23).replace("T", " "),
            alertCandidates: evaluateSimulationReadings(fixture.sensors, readings),
          });
          if (!persisted?.persisted) throw conflict("Leximet e simulimit nuk u ruajtën.");
          if (item.key === "equipment_fault") await query(pool, `UPDATE equipment SET status = 'fault'
            WHERE id = ? AND university_id = ? AND laboratory_id = ?`,
          [fixture.equipment.id, context.universityId, laboratory.id]);
          const storedReadings = await query(pool, `SELECT sensor_id AS sensorId, value,
            simulation_run_id AS runId FROM sensor_readings WHERE university_id = ?
            AND laboratory_id = ? AND simulation_run_id = ?`,
          [context.universityId, laboratory.id, run.id]);
          const alertIds = persisted.alerts.map((alert) => alert.id);
          const alerts = alertIds.length ? await query(pool, `SELECT id, severity FROM alerts
            WHERE university_id = ? AND laboratory_id = ? AND id IN (${alertIds.map(() => "?").join(",")})`,
          [context.universityId, laboratory.id, ...alertIds]) : [];
          const [storedEquipment] = await query(pool, `SELECT status FROM equipment WHERE id = ?
            AND university_id = ? AND laboratory_id = ?`,
          [fixture.equipment.id, context.universityId, laboratory.id]);
          const observedAlert = alerts.find((alert) => alert.severity === "critical") ??
            alerts.find((alert) => alert.severity === "warning") ?? null;
          const actualLevel = item.key === "equipment_fault"
            ? (storedEquipment?.status === "fault" ? "Problem state only" : "No problem state")
            : observedAlert?.severity === "critical" ? "Critical"
              : observedAlert?.severity === "warning" ? "Warning" : "Normal";
          const readingsMatch = storedReadings.length === readings.length && readings.every((reading) =>
            storedReadings.some((stored) => String(stored.sensorId) === reading.sensorId &&
              String(stored.runId) === String(run.id) && Number(stored.value) === reading.value));
          const actualResult = readingsMatch ? (actualText[actualLevel] ?? actualLevel)
            : "Leximet e kërkuara nuk u ruajtën saktë";
          const passed = readingsMatch && actualLevel === item.expected &&
            alerts.length === persisted.alerts.length &&
            (item.key !== "normal" || (storedEquipment?.status === "active" && alerts.length === 0)) &&
            (item.key !== "equipment_fault" || alerts.length === 0);
          const insert = await query(pool, `INSERT INTO thesis_functional_results
            (university_id, laboratory_id, batch_id, scenario_key, scenario_name,
              input_json, expected_result, actual_result, expected_level, actual_level,
              status, simulation_run_id, alert_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [context.universityId, laboratory.id, batchId, item.key, names[item.key],
            JSON.stringify({ ...values, equipmentStatus: item.key === "equipment_fault" ? "fault" : "active" }),
            expectedText[item.expected], actualResult, item.expected, actualLevel,
            passed ? "PASS" : "FAIL", run.id, observedAlert?.id ?? null]);
          results.push(normalized({ id: insert.insertId, batchId, scenarioKey: item.key,
            scenarioName: names[item.key], input: { ...values,
              equipmentStatus: item.key === "equipment_fault" ? "fault" : "active" },
            expectedResult: expectedText[item.expected], actualResult,
            expectedLevel: item.expected, actualLevel, status: passed ? "PASS" : "FAIL",
            runId: run.id, alertId: observedAlert?.id ?? null, executedAt: recordedAt }));
          realtimePublisher?.publishSimulationStep({ universityId: context.universityId,
            laboratoryId: laboratory.id, runId: run.id, readings, energyReadings: [],
            recordedAt, event: { type: "thesis_controlled_input", scenario: item.key } });
          for (const alert of persisted.alerts) realtimePublisher?.publishAlert({
            universityId: context.universityId, laboratoryId: laboratory.id, alert, recordedAt });
        } finally {
          await simulatorRepository.transition({ ...simulationContext, action: "stop" });
        }
      }
      let exportError = null;
      try { await exportResults(batchId, laboratory.code, results); }
      catch (error) { exportError = error.message; }
      return { laboratoryCode: laboratory.code, batchId, results, summary: summarize(results), exportError };
    } finally {
      if (locked) await query(lockConnection, "SELECT RELEASE_LOCK(?) AS released", [lockName]);
      lockConnection.release();
    }
  }

  return { latest, execute };
}
