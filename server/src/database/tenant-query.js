import { query } from "./query.js";
import { AppError } from "../utils/app-error.js";

const scopeMarkerPattern =
  /\/\*\s*TENANT_SCOPE(?::([A-Za-z_][A-Za-z0-9_]*))?\s*\*\//g;

export const tenantTables = Object.freeze([
  "users",
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
  "alerts",
  "maintenance_tasks",
  "maintenance_updates",
  "simulation_scenarios",
  "simulation_runs",
  "reports",
  "notifications",
  "activity_logs",
  "stored_files",
]);

const tenantTableSet = new Set(tenantTables);

function requiredTenantId(universityId) {
  if (
    universityId === undefined ||
    universityId === null ||
    String(universityId).trim() === ""
  ) {
    throw new TypeError("universityId është i detyrueshëm për query tenant.");
  }
  return String(universityId);
}

function scopedSql(sql) {
  if (typeof sql !== "string" || sql.trim() === "") {
    throw new TypeError("SQL tenant është i detyrueshëm.");
  }

  const matches = [...sql.matchAll(scopeMarkerPattern)];
  if (matches.length !== 1) {
    throw new TypeError(
      "Query tenant duhet të përmbajë saktësisht një /* TENANT_SCOPE */.",
    );
  }

  const markerIndex = matches[0].index;
  if (sql.slice(0, markerIndex).includes("?")) {
    throw new TypeError(
      "TENANT_SCOPE duhet të vendoset para parametrave të tjerë SQL.",
    );
  }

  const alias = matches[0][1];
  const column = alias ? `${alias}.university_id` : "university_id";
  return sql.replace(scopeMarkerPattern, `${column} = ?`);
}

function safeTenantTable(table) {
  if (!tenantTableSet.has(table)) {
    throw new TypeError(`Tabela ${table} nuk është tenant table e lejuar.`);
  }
  return `\`${table}\``;
}

function safeIdentifier(identifier, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new TypeError(`${label} nuk është identifikues SQL i vlefshëm.`);
  }
  return `\`${identifier}\``;
}

export function createTenantExecutor(executor, universityId) {
  const tenantId = requiredTenantId(universityId);

  return Object.freeze({
    universityId: tenantId,

    async query(sql, parameters = []) {
      return query(executor, scopedSql(sql), [tenantId, ...parameters]);
    },

    async queryOne(sql, parameters = []) {
      const rows = await query(executor, scopedSql(sql), [
        tenantId,
        ...parameters,
      ]);
      return rows[0] ?? null;
    },
  });
}

export async function findTenantResource(
  executor,
  { universityId, table, resourceId, columns = "*" },
) {
  const tenantId = requiredTenantId(universityId);
  const safeTable = safeTenantTable(table);
  const safeColumns =
    columns === "*"
      ? "*"
      : columns.map((column) => safeIdentifier(column, "Kolona")).join(", ");

  const rows = await query(
    executor,
    `SELECT ${safeColumns}
     FROM ${safeTable}
     WHERE university_id = ? AND id = ?
     LIMIT 1`,
    [tenantId, resourceId],
  );
  return rows[0] ?? null;
}

export async function requireTenantResource(executor, options) {
  const resource = await findTenantResource(executor, options);
  if (!resource) {
    throw new AppError({
      status: 404,
      code: "NOT_FOUND",
      message: "Burimi i kërkuar nuk u gjet.",
    });
  }
  return resource;
}

export async function requireTenantRelation(
  executor,
  {
    universityId,
    parentTable,
    parentId,
    childTable,
    childId,
    childParentColumn,
  },
) {
  const tenantId = requiredTenantId(universityId);
  const parent = safeTenantTable(parentTable);
  const child = safeTenantTable(childTable);
  const foreignKey = safeIdentifier(childParentColumn, "Foreign key");
  const rows = await query(
    executor,
    `SELECT child.id
     FROM ${child} child
     INNER JOIN ${parent} parent
       ON parent.id = child.${foreignKey}
      AND parent.university_id = child.university_id
     WHERE child.university_id = ?
       AND child.id = ?
       AND parent.id = ?
     LIMIT 1`,
    [tenantId, childId, parentId],
  );

  if (!rows[0]) {
    throw new AppError({
      status: 404,
      code: "NOT_FOUND",
      message: "Burimi i kërkuar nuk u gjet.",
    });
  }
  return true;
}
