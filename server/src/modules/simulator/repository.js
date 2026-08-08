import { query, withTransaction } from "../../database/query.js";
import { createInitialSimulationState } from "./generator.js";
import { buildScenarioConfiguration } from "./scenarios.js";

const activeStatuses = ["queued", "running", "paused"];
const transitions = {
  pause: { from: ["running"], to: "paused", ended: false },
  resume: { from: ["paused"], to: "running", ended: false },
  stop: { from: activeStatuses, to: "stopped", ended: true },
};

export function createSimulatorRepository(pool) {
  return {
    async scenarios(context) {
      const laboratory = await findAccessibleLaboratory(pool, {
        ...context,
        lock: false,
      });
      if (!laboratory) return { invalidLaboratory: true };
      const rows = await query(
        pool,
        `SELECT id, name, scenario_type AS scenarioType, description,
                configuration_json AS configuration, seed_value AS seedValue,
                status, created_at AS createdAt, updated_at AS updatedAt
         FROM simulation_scenarios
         WHERE university_id = ? AND laboratory_id = ? AND status = 'active'
         ORDER BY name, id`,
        [context.universityId, context.laboratoryId],
      );
      return {
        scenarios: rows.map((scenario) => ({
          ...scenario,
          id: String(scenario.id),
          configuration: parseJson(scenario.configuration) ?? {},
        })),
      };
    },

    async runs(context) {
      const laboratory = await findAccessibleLaboratory(pool, {
        ...context,
        lock: false,
      });
      if (!laboratory) return { invalidLaboratory: true };
      const filters = ["run.university_id = ?", "run.laboratory_id = ?"];
      const parameters = [context.universityId, context.laboratoryId];
      if (context.status) {
        filters.push("run.status = ?");
        parameters.push(context.status);
      }
      const limit = Math.max(1, Math.trunc(Number(context.limit)) || 20);
      const offset = Math.max(0, Math.trunc(Number(context.offset)) || 0);
      const where = `WHERE ${filters.join(" AND ")}`;
      const [items, totals] = await Promise.all([
        query(
          pool,
          `SELECT run.id, run.laboratory_id AS laboratoryId,
                  run.scenario_id AS scenarioId, scenario.name AS scenarioName,
                  scenario.scenario_type AS scenarioType,
                  run.status, run.started_by_user_id AS startedByUserId,
                  starter.full_name AS startedByUserName,
                  run.started_at AS startedAt, run.ended_at AS endedAt,
                  run.reset_at AS resetAt, run.created_at AS createdAt,
                  JSON_EXTRACT(run.result_json, '$.readingCount') AS readingCount,
                  JSON_EXTRACT(run.result_json, '$.energyReadingCount') AS energyReadingCount
           FROM simulation_runs run
           INNER JOIN simulation_scenarios scenario
             ON scenario.id = run.scenario_id
            AND scenario.university_id = run.university_id
           INNER JOIN users starter
             ON starter.id = run.started_by_user_id
            AND starter.university_id = run.university_id
           ${where}
           ORDER BY run.id DESC LIMIT ${limit} OFFSET ${offset}`,
          parameters,
        ),
        query(
          pool,
          `SELECT COUNT(*) AS total FROM simulation_runs run ${where}`,
          parameters,
        ),
      ]);
      return {
        items: items.map(normalizeRunListItem),
        total: Number(totals[0]?.total ?? 0),
      };
    },

    async runDetail(context) {
      const laboratory = await findAccessibleLaboratory(pool, {
        ...context,
        lock: false,
      });
      if (!laboratory) return { invalidLaboratory: true };
      const rows = await query(
        pool,
        `SELECT run.id, run.laboratory_id AS laboratoryId,
                run.scenario_id AS scenarioId, scenario.name AS scenarioName,
                scenario.scenario_type AS scenarioType, run.status,
                run.seed_value AS seedValue, run.input_json AS input,
                run.configuration_snapshot_json AS configurationSnapshot,
                run.baseline_state_json AS baselineState,
                run.result_json AS result, run.outcome_json AS outcome,
                run.started_by_user_id AS startedByUserId,
                starter.full_name AS startedByUserName,
                run.reset_by_user_id AS resetByUserId,
                resetter.full_name AS resetByUserName,
                run.started_at AS startedAt, run.ended_at AS endedAt,
                run.reset_at AS resetAt, run.created_at AS createdAt
         FROM simulation_runs run
         INNER JOIN simulation_scenarios scenario
           ON scenario.id = run.scenario_id
          AND scenario.university_id = run.university_id
         INNER JOIN users starter
           ON starter.id = run.started_by_user_id
          AND starter.university_id = run.university_id
         LEFT JOIN users resetter
           ON resetter.id = run.reset_by_user_id
          AND resetter.university_id = run.university_id
         WHERE run.university_id = ? AND run.laboratory_id = ? AND run.id = ?
         LIMIT 1`,
        [context.universityId, context.laboratoryId, context.runId],
      );
      if (!rows[0]) return null;
      const timeline = await query(
        pool,
        `SELECT id, user_id AS userId, event_type AS eventType,
                sequence_number AS sequenceNumber,
                event_data_json AS eventData, occurred_at AS occurredAt
         FROM simulation_run_events
         WHERE university_id = ? AND simulation_run_id = ?
         ORDER BY sequence_number, id`,
        [context.universityId, context.runId],
      );
      return {
        ...normalizeRun(rows[0]),
        configurationSnapshot: parseJson(rows[0].configurationSnapshot),
        baselineState: parseJson(rows[0].baselineState),
        outcome: parseJson(rows[0].outcome),
        timeline: timeline.map((event) => ({
          ...event,
          id: String(event.id),
          userId: event.userId == null ? null : String(event.userId),
          sequenceNumber: Number(event.sequenceNumber),
          eventData: parseJson(event.eventData) ?? {},
        })),
      };
    },

    async previewSource(context) {
      const laboratory = await findAccessibleLaboratory(pool, {
        ...context,
        lock: false,
      });
      if (!laboratory) return { invalidLaboratory: true };
      const rows = await query(
        pool,
        `SELECT id, name, scenario_type AS scenarioType,
                configuration_json AS configuration, seed_value AS seedValue
         FROM simulation_scenarios
         WHERE university_id = ? AND laboratory_id = ? AND id = ?
           AND status = 'active'
         LIMIT 1`,
        [context.universityId, context.laboratoryId, context.scenarioId],
      );
      if (!rows[0]) return { invalidScenario: true };
      return {
        ...rows[0],
        id: String(rows[0].id),
        configuration: parseJson(rows[0].configuration) ?? {},
      };
    },

    async status(context) {
      const laboratory = await findAccessibleLaboratory(pool, {
        ...context,
        lock: false,
      });
      if (!laboratory) return { invalidLaboratory: true };
      const rows = await query(
        pool,
        `SELECT run.id, run.laboratory_id AS laboratoryId,
                run.scenario_id AS scenarioId, scenario.name AS scenarioName,
                scenario.scenario_type AS scenarioType,
                run.status, run.seed_value AS seedValue,
                run.input_json AS input,
                run.result_json AS result,
                run.started_at AS startedAt, run.ended_at AS endedAt,
                run.created_at AS createdAt
         FROM simulation_runs run
         INNER JOIN simulation_scenarios scenario
           ON scenario.id = run.scenario_id
          AND scenario.university_id = run.university_id
         WHERE run.university_id = ?
           AND run.laboratory_id = ?
         ORDER BY run.id DESC
         LIMIT 1`,
        [context.universityId, context.laboratoryId],
      );
      return { run: normalizeRun(rows[0] ?? null) };
    },

    async start(context) {
      return withTransaction(pool, async (connection) => {
        const laboratory = await findAccessibleLaboratory(connection, context);
        if (!laboratory) return { invalidLaboratory: true };
        const existing = await query(
          connection,
          `SELECT id
           FROM simulation_runs
           WHERE university_id = ?
             AND laboratory_id = ?
             AND status IN ('queued', 'running', 'paused')
           LIMIT 1
           FOR UPDATE`,
          [context.universityId, context.laboratoryId],
        );
        if (existing[0]) return { duplicateRun: true };
        const scenarios = await query(
          connection,
          `SELECT id, name, scenario_type AS scenarioType,
                  configuration_json AS configuration,
                  seed_value AS seedValue
           FROM simulation_scenarios
           WHERE university_id = ?
             AND laboratory_id = ?
             AND id = ?
             AND status = 'active'
           LIMIT 1
           FOR UPDATE`,
          [context.universityId, context.laboratoryId, context.scenarioId],
        );
        const scenario = scenarios[0];
        if (!scenario) return { invalidScenario: true };
        const built = buildScenarioConfiguration({
          scenarioType: scenario.scenarioType,
          storedConfiguration: parseJson(scenario.configuration) ?? {},
          overrides: context.overrides,
        });
        if (built.validationError || built.invalidScenarioType) {
          return { invalidConfiguration: true };
        }
        const configuration = built.configuration;
        const baselineState = createInitialSimulationState(configuration);
        const input = {
          configuration,
          samplingIntervalSeconds: context.samplingIntervalSeconds,
          generatorVersion: 1,
        };
        const result = await query(
          connection,
          `INSERT INTO simulation_runs (
             university_id, laboratory_id, scenario_id, started_by_user_id,
             status, seed_value, input_json, configuration_snapshot_json,
             baseline_state_json, result_json, started_at
           ) VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
          [
            context.universityId,
            context.laboratoryId,
            context.scenarioId,
            context.userId,
            scenario.seedValue,
            JSON.stringify(input),
            JSON.stringify(configuration),
            JSON.stringify(baselineState),
            JSON.stringify({ generatorState: baselineState }),
          ],
        );
        const run = {
          id: String(result.insertId),
          laboratoryId: String(context.laboratoryId),
          scenarioId: String(context.scenarioId),
          scenarioName: scenario.name,
          scenarioType: scenario.scenarioType,
          status: "running",
          seedValue: scenario.seedValue,
          input,
          baselineState,
        };
        await appendRunEvent(connection, {
          ...context,
          runId: run.id,
          eventType: "started",
          eventData: {
            scenarioId: context.scenarioId,
            configuration,
            baselineState,
          },
        });
        await writeAudit(connection, {
          ...context,
          runId: run.id,
          action: "simulation.started",
          description: `U nis simulimi ${scenario.name}.`,
          metadata: {
            scenarioId: context.scenarioId,
            samplingIntervalSeconds: context.samplingIntervalSeconds,
          },
        });
        return run;
      });
    },

    async transition(context) {
      return withTransaction(pool, async (connection) => {
        const laboratory = await findAccessibleLaboratory(connection, context);
        if (!laboratory) return { invalidLaboratory: true };
        const rows = await query(
          connection,
          `SELECT run.id, run.status, scenario.name AS scenarioName
           FROM simulation_runs run
           INNER JOIN simulation_scenarios scenario
             ON scenario.id = run.scenario_id
            AND scenario.university_id = run.university_id
           WHERE run.university_id = ?
             AND run.laboratory_id = ?
             AND run.status IN ('queued', 'running', 'paused')
           ORDER BY run.id DESC
           LIMIT 1
           FOR UPDATE`,
          [context.universityId, context.laboratoryId],
        );
        const run = rows[0];
        if (!run) return { noActiveRun: true };
        const transition = transitions[context.action];
        if (!transition?.from.includes(run.status)) {
          return { invalidState: true };
        }
        await query(
          connection,
          `UPDATE simulation_runs
           SET status = ?,
               ended_at = ${transition.ended ? "UTC_TIMESTAMP(3)" : "NULL"}
           WHERE university_id = ? AND laboratory_id = ? AND id = ?`,
          [transition.to, context.universityId, context.laboratoryId, run.id],
        );
        await appendRunEvent(connection, {
          ...context,
          runId: String(run.id),
          eventType: {
            pause: "paused",
            resume: "resumed",
            stop: "stopped",
          }[context.action],
          eventData: { previousStatus: run.status, status: transition.to },
        });
        const actionLabels = {
          pause: "simulation.paused",
          resume: "simulation.resumed",
          stop: "simulation.stopped",
        };
        await writeAudit(connection, {
          ...context,
          runId: String(run.id),
          action: actionLabels[context.action],
          description: `U ${actionDescription(context.action)} simulimi ${run.scenarioName}.`,
          metadata: { previousStatus: run.status, status: transition.to },
        });
        return {
          id: String(run.id),
          laboratoryId: String(context.laboratoryId),
          scenarioName: run.scenarioName,
          status: transition.to,
        };
      });
    },

    async reset(context) {
      return withTransaction(pool, async (connection) => {
        const laboratory = await findAccessibleLaboratory(connection, context);
        if (!laboratory) return { invalidLaboratory: true };
        const rows = await query(
          connection,
          `SELECT run.id, run.status, run.baseline_state_json AS baselineState,
                  scenario.name AS scenarioName
           FROM simulation_runs run
           INNER JOIN simulation_scenarios scenario
             ON scenario.id = run.scenario_id
            AND scenario.university_id = run.university_id
           WHERE run.university_id = ? AND run.laboratory_id = ?
           ORDER BY run.id DESC LIMIT 1 FOR UPDATE`,
          [context.universityId, context.laboratoryId],
        );
        const run = rows[0];
        if (!run) return { noActiveRun: true };
        const baselineState = parseJson(run.baselineState);
        if (!baselineState) return { invalidState: true };
        await query(
          connection,
          `UPDATE simulation_runs
           SET status = 'stopped',
               result_json = JSON_OBJECT('generatorState', CAST(? AS JSON)),
               outcome_json = JSON_OBJECT(
                 'resetFromStatus', ?, 'baselineRestored', TRUE
               ),
               reset_by_user_id = ?, reset_at = UTC_TIMESTAMP(3),
               ended_at = COALESCE(ended_at, UTC_TIMESTAMP(3))
           WHERE university_id = ? AND laboratory_id = ? AND id = ?`,
          [
            JSON.stringify(baselineState),
            run.status,
            context.userId,
            context.universityId,
            context.laboratoryId,
            run.id,
          ],
        );
        await appendRunEvent(connection, {
          ...context,
          runId: String(run.id),
          eventType: "reset",
          eventData: { previousStatus: run.status, baselineState },
        });
        await writeAudit(connection, {
          ...context,
          runId: String(run.id),
          action: "simulation.reset",
          description: `U rivendos simulimi ${run.scenarioName} në baseline.`,
          metadata: { previousStatus: run.status, baselineRestored: true },
        });
        return {
          id: String(run.id),
          laboratoryId: String(context.laboratoryId),
          scenarioName: run.scenarioName,
          status: "stopped",
          baselineState,
          reset: true,
        };
      });
    },

    async recoverableRuns() {
      const rows = await query(
        pool,
        `SELECT id, university_id AS universityId,
                laboratory_id AS laboratoryId, status
         FROM simulation_runs
         WHERE status IN ('running', 'paused')
         ORDER BY id`,
      );
      return rows.map((run) => ({
        ...run,
        id: String(run.id),
        universityId: String(run.universityId),
        laboratoryId: String(run.laboratoryId),
      }));
    },

    async loadRuntime({ universityId, laboratoryId, runId }) {
      const runRows = await query(
        pool,
        `SELECT id, status, seed_value AS seedValue,
                input_json AS input, result_json AS result
         FROM simulation_runs
         WHERE university_id = ? AND laboratory_id = ? AND id = ?
         LIMIT 1`,
        [universityId, laboratoryId, runId],
      );
      const run = runRows[0];
      if (!run) return null;
      const [sensors, equipment] = await Promise.all([
        query(
          pool,
          `SELECT id, equipment_id AS equipmentId, name,
                  sensor_type AS sensorType, unit,
                  warning_min AS warningMin, warning_max AS warningMax,
                  critical_min AS criticalMin, critical_max AS criticalMax
           FROM sensors
           WHERE university_id = ? AND laboratory_id = ?
             AND status = 'online' AND deleted_at IS NULL
           ORDER BY id`,
          [universityId, laboratoryId],
        ),
        query(
          pool,
          `SELECT id, energy_rating_watts AS energyRatingWatts,
                  health_score AS healthScore
           FROM equipment
           WHERE university_id = ? AND laboratory_id = ?
             AND status = 'active' AND deleted_at IS NULL
           ORDER BY id`,
          [universityId, laboratoryId],
        ),
      ]);
      return {
        id: String(run.id),
        universityId: String(universityId),
        laboratoryId: String(laboratoryId),
        status: run.status,
        seedValue: run.seedValue,
        input: parseJson(run.input) ?? {},
        result: parseJson(run.result) ?? {},
        sensors: sensors.map((sensor) => ({
          ...sensor,
          id: String(sensor.id),
        })),
        equipment: equipment.map((item) => ({
          ...item,
          id: String(item.id),
        })),
      };
    },

    async persistStep({
      universityId,
      laboratoryId,
      runId,
      readings,
      energyReadings,
      generatorState,
      event,
      recordedAt,
      alertCandidates = [],
    }) {
      return withTransaction(pool, async (connection) => {
        const runs = await query(
          connection,
          `SELECT id, result_json AS result
           FROM simulation_runs
           WHERE university_id = ? AND laboratory_id = ? AND id = ?
             AND status = 'running'
           LIMIT 1
           FOR UPDATE`,
          [universityId, laboratoryId, runId],
        );
        if (!runs[0]) return false;
        for (const reading of readings) {
          await query(
            connection,
            `INSERT INTO sensor_readings (
               university_id, laboratory_id, sensor_id, value,
               recorded_at, source, simulation_run_id
             ) VALUES (?, ?, ?, ?, ?, 'simulated', ?)`,
            [
              universityId,
              laboratoryId,
              reading.sensorId,
              reading.value,
              recordedAt,
              runId,
            ],
          );
        }
        for (const reading of energyReadings) {
          await query(
            connection,
            `INSERT INTO energy_readings (
               university_id, laboratory_id, equipment_id,
               power_watts, energy_kwh, recorded_at, source
             ) VALUES (?, ?, ?, ?, ?, ?, 'simulated')`,
            [
              universityId,
              laboratoryId,
              reading.equipmentId,
              reading.powerWatts,
              reading.energyKwh,
              recordedAt,
            ],
          );
        }
        const alerts = [];
        for (const candidate of alertCandidates) {
          const alertResult = await query(
            connection,
            `INSERT INTO alerts (
               university_id, laboratory_id, sensor_id, equipment_id,
               category, severity, title, description, status, source,
               deduplication_key, last_triggered_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               id = LAST_INSERT_ID(id), severity = VALUES(severity),
               title = VALUES(title), description = VALUES(description),
               last_triggered_at = VALUES(last_triggered_at),
               updated_at = CURRENT_TIMESTAMP(3)`,
            [
              universityId,
              laboratoryId,
              candidate.sensorId,
              candidate.equipmentId,
              candidate.category,
              candidate.severity,
              candidate.title,
              candidate.description,
              candidate.source,
              candidate.deduplicationKey,
              recordedAt,
            ],
          );
          alerts.push({
            id: String(alertResult.insertId),
            created: Number(alertResult.affectedRows) === 1,
            ...candidate,
          });
          if (Number(alertResult.affectedRows) === 1) {
            const recipients = await query(
              connection,
              `SELECT DISTINCT user_account.id
               FROM users user_account
               INNER JOIN user_roles user_role
                 ON user_role.user_id = user_account.id
                AND user_role.university_id = user_account.university_id
               INNER JOIN roles role ON role.id = user_role.role_id
               WHERE user_account.university_id = ?
                 AND user_account.status = 'active'
                 AND user_account.deleted_at IS NULL
                 AND role.code IN (
                   'university_admin', 'lab_manager', 'technician',
                   'academic_staff', 'observer'
                 )
                 AND (
                   role.code = 'university_admin'
                   OR EXISTS (
                     SELECT 1 FROM user_laboratory_assignments assignment
                     WHERE assignment.university_id = user_account.university_id
                       AND assignment.user_id = user_account.id
                       AND assignment.laboratory_id = ?
                   )
                 )`,
              [universityId, laboratoryId],
            );
            for (const recipient of recipients) {
              await query(
                connection,
                `INSERT INTO notifications (
                   university_id, user_id, alert_id, type, title, message
                 ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  universityId,
                  recipient.id,
                  alertResult.insertId,
                  `alert_${candidate.severity}`,
                  candidate.title,
                  candidate.description,
                ],
              );
            }
            alerts.at(-1).recipientUserIds = recipients.map(({ id }) =>
              String(id),
            );
          }
        }
        const previous = parseJson(runs[0].result) ?? {};
        const result = {
          ...previous,
          generatorState,
          lastRecordedAt: recordedAt,
          readingCount: Number(previous.readingCount ?? 0) + readings.length,
          energyReadingCount:
            Number(previous.energyReadingCount ?? 0) + energyReadings.length,
          lastEvent: event,
        };
        await query(
          connection,
          `UPDATE simulation_runs
           SET result_json = ?
           WHERE university_id = ? AND laboratory_id = ? AND id = ?`,
          [JSON.stringify(result), universityId, laboratoryId, runId],
        );
        await appendRunEvent(connection, {
          universityId,
          runId,
          eventType: "reading_generated",
          eventData: {
            readingCount: readings.length,
            energyReadingCount: energyReadings.length,
            generatorState,
            event,
          },
          occurredAt: recordedAt,
        });
        for (const alert of alerts.filter(({ created }) => created)) {
          await appendRunEvent(connection, {
            universityId,
            runId,
            eventType: "alert_generated",
            eventData: {
              alertId: alert.id,
              severity: alert.severity,
              category: alert.category,
            },
            occurredAt: recordedAt,
          });
        }
        return { persisted: true, alerts };
      });
    },

    async markFailed({ universityId, laboratoryId, runId, message }) {
      await query(
        pool,
        `UPDATE simulation_runs
         SET status = 'failed', ended_at = UTC_TIMESTAMP(3),
             result_json = JSON_SET(
               COALESCE(result_json, JSON_OBJECT()),
               '$.failureMessage', ?
             )
         WHERE university_id = ? AND laboratory_id = ? AND id = ?
           AND status = 'running'`,
        [String(message).slice(0, 500), universityId, laboratoryId, runId],
      );
    },
  };
}

async function appendRunEvent(
  connection,
  { universityId, runId, userId = null, eventType, eventData, occurredAt },
) {
  const rows = await query(
    connection,
    `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS nextSequence
     FROM simulation_run_events
     WHERE university_id = ? AND simulation_run_id = ?
     FOR UPDATE`,
    [universityId, runId],
  );
  return query(
    connection,
    `INSERT INTO simulation_run_events (
       university_id, simulation_run_id, user_id, event_type,
       sequence_number, event_data_json, occurred_at
     ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, UTC_TIMESTAMP(3)))`,
    [
      universityId,
      runId,
      userId,
      eventType,
      Number(rows[0]?.nextSequence ?? 1),
      JSON.stringify(eventData ?? {}),
      occurredAt ?? null,
    ],
  );
}

async function findAccessibleLaboratory(
  connection,
  { universityId, laboratoryId, userId, restrictToAssignments, lock = true },
) {
  const rows = await query(
    connection,
    `SELECT laboratory.id
     FROM laboratories laboratory
     WHERE laboratory.university_id = ?
       AND laboratory.id = ?
       AND laboratory.deleted_at IS NULL
       AND (? = 0 OR EXISTS (
         SELECT 1
         FROM user_laboratory_assignments assignment
         WHERE assignment.university_id = laboratory.university_id
           AND assignment.laboratory_id = laboratory.id
           AND assignment.user_id = ?
       ))
     LIMIT 1
     ${lock ? "FOR UPDATE" : ""}`,
    [universityId, laboratoryId, restrictToAssignments ? 1 : 0, userId],
  );
  return rows[0] ?? null;
}

function writeAudit(
  connection,
  {
    universityId,
    userId,
    laboratoryId,
    runId,
    action,
    description,
    metadata,
    ipAddress,
  },
) {
  return query(
    connection,
    `INSERT INTO activity_logs (
       university_id, user_id, action, entity_type, entity_id,
       description, metadata_json, ip_address
     ) VALUES (?, ?, ?, 'simulation_run', ?, ?, ?, ?)`,
    [
      universityId,
      userId,
      action,
      runId,
      description,
      JSON.stringify({ laboratoryId, ...metadata }),
      ipAddress,
    ],
  );
}

function normalizeRun(run) {
  if (!run) return null;
  return {
    ...run,
    id: String(run.id),
    laboratoryId: String(run.laboratoryId),
    scenarioId: String(run.scenarioId),
    input: parseJson(run.input),
    result: parseJson(run.result),
  };
}

function normalizeRunListItem(run) {
  return {
    ...run,
    id: String(run.id),
    laboratoryId: String(run.laboratoryId),
    scenarioId: String(run.scenarioId),
    startedByUserId: String(run.startedByUserId),
    readingCount: Number(run.readingCount ?? 0),
    energyReadingCount: Number(run.energyReadingCount ?? 0),
  };
}

function parseJson(value) {
  if (value == null || typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function actionDescription(action) {
  return {
    pause: "pezullua",
    resume: "rifillua",
    stop: "ndal",
  }[action];
}
