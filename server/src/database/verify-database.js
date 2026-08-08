import { query } from "./query.js";

const requiredTables = [
  "universities",
  "university_registration_requests",
  "platform_admins",
  "platform_refresh_tokens",
  "platform_activity_logs",
  "users",
  "roles",
  "user_roles",
  "user_laboratory_assignments",
  "refresh_tokens",
  "password_reset_tokens",
  "laboratories",
  "laboratory_zones",
  "equipment",
  "sensors",
  "sensor_readings",
  "energy_readings",
  "sensor_reading_aggregates",
  "energy_reading_aggregates",
  "university_energy_settings",
  "alerts",
  "alert_status_updates",
  "maintenance_tasks",
  "maintenance_updates",
  "maintenance_evidence",
  "simulation_scenarios",
  "simulation_runs",
  "simulation_run_events",
  "reports",
  "notifications",
  "activity_logs",
  "stored_files",
];

const tenantTables = requiredTables.filter(
  (table) =>
    ![
      "universities",
      "university_registration_requests",
      "platform_admins",
      "platform_refresh_tokens",
      "platform_activity_logs",
      "roles",
    ].includes(table),
);

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function verifyDatabase(pool, databaseName) {
  const tables = await query(
    pool,
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = ?`,
    [databaseName],
  );
  const tableNames = new Set(tables.map((row) => row.TABLE_NAME));

  for (const table of requiredTables) {
    assertCondition(
      tableNames.has(table),
      `Mungon tabela e detyrueshme: ${table}`,
    );
  }

  const tenantColumns = await query(
    pool,
    `SELECT table_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = ?
        AND column_name = 'university_id'`,
    [databaseName],
  );
  const tenantColumnMap = new Map(
    tenantColumns.map((row) => [row.TABLE_NAME, row.IS_NULLABLE]),
  );

  for (const table of tenantTables) {
    assertCondition(
      tenantColumnMap.get(table) === "NO",
      `${table} nuk ka university_id NOT NULL.`,
    );
  }

  const tenantIndexes = await query(
    pool,
    `SELECT DISTINCT table_name
       FROM information_schema.statistics
      WHERE table_schema = ?
        AND column_name = 'university_id'
        AND seq_in_index = 1`,
    [databaseName],
  );
  const indexedTables = new Set(tenantIndexes.map((row) => row.TABLE_NAME));

  for (const table of tenantTables) {
    assertCondition(
      indexedTables.has(table),
      `${table} nuk ka indeks që fillon me university_id.`,
    );
  }

  const directTenantForeignKeys = await query(
    pool,
    `SELECT DISTINCT table_name
       FROM information_schema.key_column_usage
      WHERE table_schema = ?
        AND column_name = 'university_id'
        AND referenced_table_name = 'universities'
        AND referenced_column_name = 'id'`,
    [databaseName],
  );
  const protectedTables = new Set(
    directTenantForeignKeys.map((row) => row.TABLE_NAME),
  );

  for (const table of tenantTables) {
    assertCondition(
      protectedTables.has(table),
      `${table} nuk ka foreign key drejt universitetit.`,
    );
  }

  const universitySummary = await query(
    pool,
    `SELECT
       u.id,
       u.name,
       COUNT(DISTINCT usr.id) AS user_count,
       COUNT(DISTINCT lab.id) AS laboratory_count,
       COUNT(DISTINCT eq.id) AS equipment_count,
       COUNT(DISTINCT sen.id) AS sensor_count
     FROM universities u
     LEFT JOIN users usr ON usr.university_id = u.id
     LEFT JOIN laboratories lab ON lab.university_id = u.id
     LEFT JOIN equipment eq ON eq.university_id = u.id
     LEFT JOIN sensors sen ON sen.university_id = u.id
     WHERE u.official_website IN (?, ?)
     GROUP BY u.id, u.name
     ORDER BY u.id`,
    ["https://uni-prishtina.demo", "https://upt.demo"],
  );

  assertCondition(
    universitySummary.length === 2,
    "Duhet të ekzistojnë saktësisht dy universitete demonstruese.",
  );

  for (const university of universitySummary) {
    assertCondition(
      Number(university.user_count) > 0 &&
        Number(university.laboratory_count) > 0 &&
        Number(university.equipment_count) > 0 &&
        Number(university.sensor_count) > 0,
      `${university.name} nuk ka grupin e plotë të të dhënave demonstruese.`,
    );
  }

  const duplicateAssetCodes = await query(
    pool,
    `SELECT code
       FROM sensors
      GROUP BY code
     HAVING COUNT(DISTINCT university_id) > 1`,
  );
  assertCondition(
    duplicateAssetCodes.length === 0,
    "Universitetet demonstruese duhet të kenë kode sensorësh të dallueshme.",
  );

  const passwordRows = await query(
    pool,
    `SELECT password_hash FROM users
     UNION ALL
     SELECT password_hash FROM platform_admins`,
  );
  assertCondition(
    passwordRows.length >= 5 &&
      passwordRows.every((row) => /^\$2[aby]\$\d{2}\$/.test(row.password_hash)),
    "Fjalëkalimet demonstruese nuk janë ruajtur të gjitha si bcrypt hash.",
  );

  return {
    tableCount: requiredTables.length,
    tenantTableCount: tenantTables.length,
    universities: universitySummary,
  };
}
