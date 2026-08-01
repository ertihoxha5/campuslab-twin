import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationUrl = new URL(
  "../migrations/007_reading_aggregates.up.sql",
  import.meta.url,
);
const rollbackUrl = new URL(
  "../migrations/007_reading_aggregates.down.sql",
  import.meta.url,
);

test("reading aggregate migration is tenant-scoped and source-aware", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE sensor_reading_aggregates/);
  assert.match(sql, /CREATE TABLE energy_reading_aggregates/);
  assert.equal(
    (sql.match(/university_id BIGINT UNSIGNED NOT NULL/g) ?? []).length,
    2,
  );
  assert.match(sql, /interval_minutes SMALLINT UNSIGNED NOT NULL/);
  assert.match(sql, /source ENUM\('simulated', 'physical', 'imported'\)/);
  assert.match(sql, /UNIQUE KEY uq_sensor_aggregates_bucket/);
  assert.match(sql, /UNIQUE KEY uq_energy_aggregates_bucket/);
});

test("reading aggregate rollback removes both aggregate tables", async () => {
  const sql = await readFile(rollbackUrl, "utf8");

  assert.match(sql, /DROP TABLE IF EXISTS energy_reading_aggregates/);
  assert.match(sql, /DROP TABLE IF EXISTS sensor_reading_aggregates/);
});

test("energy aggregate scope migration deduplicates laboratory totals", async () => {
  const sql = await readFile(
    new URL("../migrations/008_energy_aggregate_scope_key.up.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /GENERATED ALWAYS AS \(IFNULL\(equipment_id, 0\)\) STORED/);
  assert.match(sql, /UNIQUE KEY uq_energy_aggregates_bucket/);
  assert.match(sql, /equipment_scope_id/);
});
