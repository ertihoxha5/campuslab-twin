import { query } from "../../database/query.js";

const sensorMetrics = new Set([
  "temperature",
  "humidity",
  "co2",
  "occupancy",
  "smoke",
]);
const bucketExpressions = {
  hourly: "DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00')",
  daily: "DATE(recorded_at)",
  weekly: "DATE_SUB(DATE(recorded_at), INTERVAL WEEKDAY(recorded_at) DAY)",
  monthly: "DATE_FORMAT(recorded_at, '%Y-%m-01')",
};

export function createAnalyticsRepository(pool) {
  return {
    async history(context) {
      if (sensorMetrics.has(context.metric))
        return sensorHistory(pool, context);
      if (context.metric === "power") return powerHistory(pool, context);
      if (context.metric === "equipment_health")
        return healthHistory(pool, context);
      if (context.metric === "alerts")
        return eventCountHistory(
          pool,
          context,
          "alerts",
          "created_at",
          "alert",
        );
      return eventCountHistory(
        pool,
        context,
        "maintenance_tasks",
        "created_at",
        "maintenance",
      );
    },
  };
}

async function sensorHistory(pool, context) {
  const filters = [
    "reading.university_id = ?",
    "sensor.sensor_type = ?",
    "reading.recorded_at >= ?",
    "reading.recorded_at <= ?",
    assignmentScope("reading"),
  ];
  const parameters = baseParameters(context, context.metric);
  optionalFilters(
    filters,
    parameters,
    context,
    "reading.laboratory_id",
    "reading.sensor_id",
  );
  return numericHistory(pool, {
    tableSql:
      "sensor_readings reading INNER JOIN sensors sensor ON sensor.id = reading.sensor_id AND sensor.university_id = reading.university_id",
    valueSql: "reading.value",
    timeColumn: "reading.recorded_at",
    sourceColumn: "reading.source",
    filters,
    parameters,
    interval: context.interval,
  });
}

async function powerHistory(pool, context) {
  const filters = [
    "reading.university_id = ?",
    "reading.recorded_at >= ?",
    "reading.recorded_at <= ?",
    assignmentScope("reading"),
  ];
  const parameters = baseParameters(context);
  optionalFilters(
    filters,
    parameters,
    context,
    "reading.laboratory_id",
    "reading.equipment_id",
  );
  return numericHistory(pool, {
    tableSql: "energy_readings reading",
    valueSql: "reading.power_watts",
    timeColumn: "reading.recorded_at",
    sourceColumn: "reading.source",
    filters,
    parameters,
    interval: context.interval,
  });
}

async function healthHistory(pool, context) {
  const filters = [
    "event.university_id = ?",
    "event.event_type = 'reading_generated'",
    "event.occurred_at >= ?",
    "event.occurred_at <= ?",
    assignmentScope("run"),
  ];
  const parameters = baseParameters(context);
  if (context.laboratoryId) {
    filters.push("run.laboratory_id = ?");
    parameters.push(context.laboratoryId);
  }
  return numericHistory(pool, {
    tableSql:
      "simulation_run_events event INNER JOIN simulation_runs run ON run.id = event.simulation_run_id AND run.university_id = event.university_id",
    valueSql:
      "CAST(JSON_UNQUOTE(JSON_EXTRACT(event.event_data_json, '$.generatorState.values.equipment_health')) AS DECIMAL(12,4))",
    timeColumn: "event.occurred_at",
    sourceColumn: "'simulated'",
    filters,
    parameters,
    interval: context.interval,
  });
}

async function numericHistory(pool, config) {
  const where = `WHERE ${config.filters.join(" AND ")}`;
  const bucket = bucketExpressions[config.interval].replaceAll(
    "recorded_at",
    config.timeColumn,
  );
  const [series, summaries, provenance] = await Promise.all([
    query(
      pool,
      `SELECT ${bucket} AS bucketStart, AVG(${config.valueSql}) AS value, MIN(${config.valueSql}) AS minimum, MAX(${config.valueSql}) AS maximum, COUNT(*) AS samples FROM ${config.tableSql} ${where} GROUP BY bucketStart ORDER BY bucketStart`,
      config.parameters,
    ),
    query(
      pool,
      `SELECT AVG(${config.valueSql}) AS value, MIN(${config.valueSql}) AS minimum, MAX(${config.valueSql}) AS maximum, COUNT(*) AS samples FROM ${config.tableSql} ${where}`,
      config.parameters,
    ),
    query(
      pool,
      `SELECT ${config.sourceColumn} AS source, COUNT(*) AS samples FROM ${config.tableSql} ${where} GROUP BY source ORDER BY source`,
      config.parameters,
    ),
  ]);
  return { series, summary: summaries[0] ?? {}, provenance };
}

async function eventCountHistory(pool, context, table, timeColumn, source) {
  const alias = source === "alert" ? "event" : "event";
  const filters = [
    `${alias}.university_id = ?`,
    `${alias}.${timeColumn} >= ?`,
    `${alias}.${timeColumn} <= ?`,
    assignmentScope(alias),
  ];
  const parameters = baseParameters(context);
  optionalFilters(
    filters,
    parameters,
    context,
    `${alias}.laboratory_id`,
    source === "alert" ? `${alias}.equipment_id` : `${alias}.equipment_id`,
  );
  const bucket = bucketExpressions[context.interval].replaceAll(
    "recorded_at",
    `${alias}.${timeColumn}`,
  );
  const where = `WHERE ${filters.join(" AND ")}`;
  const [series, totals] = await Promise.all([
    query(
      pool,
      `SELECT ${bucket} AS bucketStart, COUNT(*) AS value, NULL AS minimum, NULL AS maximum, COUNT(*) AS samples FROM ${table} ${alias} ${where} GROUP BY bucketStart ORDER BY bucketStart`,
      parameters,
    ),
    query(
      pool,
      `SELECT COUNT(*) AS value, NULL AS minimum, NULL AS maximum, COUNT(*) AS samples FROM ${table} ${alias} ${where}`,
      parameters,
    ),
  ]);
  return {
    series,
    summary: totals[0] ?? {},
    provenance: [{ source, samples: totals[0]?.samples ?? 0 }],
  };
}

function baseParameters(context, extra) {
  return [
    context.universityId,
    ...(extra ? [extra] : []),
    toSqlDate(context.startAt),
    toSqlDate(context.endAt),
    context.restrictToAssignments ? 1 : 0,
    context.userId,
  ];
}
function optionalFilters(
  filters,
  parameters,
  context,
  laboratoryColumn,
  assetColumn,
) {
  if (context.laboratoryId) {
    filters.push(`${laboratoryColumn} = ?`);
    parameters.push(context.laboratoryId);
  }
  if (context.assetId) {
    filters.push(`${assetColumn} = ?`);
    parameters.push(context.assetId);
  }
}
function assignmentScope(alias) {
  return `(? = 0 OR EXISTS (SELECT 1 FROM user_laboratory_assignments assignment WHERE assignment.university_id = ${alias}.university_id AND assignment.laboratory_id = ${alias}.laboratory_id AND assignment.user_id = ?))`;
}
function toSqlDate(value) {
  return value.toISOString().slice(0, 23).replace("T", " ");
}
