import { query, withTransaction } from "../../database/query.js";

const activeStatuses = ["queued", "running", "paused"];
const transitions = {
  pause: { from: ["running"], to: "paused", ended: false },
  resume: { from: ["paused"], to: "running", ended: false },
  stop: { from: activeStatuses, to: "stopped", ended: true },
};

export function createSimulatorRepository(pool) {
  return {
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
        const input = {
          configuration: parseJson(scenario.configuration) ?? {},
          samplingIntervalSeconds: context.samplingIntervalSeconds,
          generatorVersion: 1,
        };
        const result = await query(
          connection,
          `INSERT INTO simulation_runs (
             university_id, laboratory_id, scenario_id, started_by_user_id,
             status, seed_value, input_json, started_at
           ) VALUES (?, ?, ?, ?, 'running', ?, ?, UTC_TIMESTAMP(3))`,
          [
            context.universityId,
            context.laboratoryId,
            context.scenarioId,
            context.userId,
            scenario.seedValue,
            JSON.stringify(input),
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
        };
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
  };
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
