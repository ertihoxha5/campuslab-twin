import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const migration = fs.readFileSync(
  path.join(serverDirectory, "migrations", "001_initial_schema.up.sql"),
  "utf8",
);

const requiredTables = [
  "universities",
  "university_registration_requests",
  "platform_admins",
  "users",
  "roles",
  "user_roles",
  "user_laboratory_assignments",
  "refresh_tokens",
  "laboratories",
  "laboratory_zones",
  "equipment",
  "sensors",
  "sensor_readings",
  "energy_readings",
  "alerts",
  "maintenance_tasks",
  "maintenance_updates",
  "simulation_scenarios",
  "simulation_runs",
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
      "roles",
    ].includes(table),
);

function tableDefinition(table) {
  const start = migration.indexOf(`CREATE TABLE ${table} (`);
  const end = migration.indexOf(") ENGINE=InnoDB;", start);

  return migration.slice(start, end);
}

test("initial migration creates every required CLT-02 entity", () => {
  for (const table of requiredTables) {
    assert.match(migration, new RegExp(`CREATE TABLE ${table} \\(`));
  }
});

test("every tenant-owned table has a required university identifier", () => {
  for (const table of tenantTables) {
    const definition = tableDefinition(table);
    assert.match(
      definition,
      /university_id BIGINT UNSIGNED NOT NULL/,
      `${table} duhet të ketë university_id NOT NULL`,
    );
    assert.match(
      definition,
      /KEY [^(]+\(university_id,/,
      `${table} duhet të ketë indeks që fillon me university_id`,
    );
  }
});

test("migration contains no ORM or Prisma artifacts", () => {
  assert.doesNotMatch(migration, /prisma|sequelize|typeorm/i);
});
