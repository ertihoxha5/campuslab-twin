import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const upUrl = new URL(
  "../migrations/014_simulation_experiments.up.sql",
  import.meta.url,
);
const downUrl = new URL(
  "../migrations/014_simulation_experiments.down.sql",
  import.meta.url,
);

test("simulation experiments preserve configuration, baseline, outcome, and reset attribution", async () => {
  const sql = await readFile(upUrl, "utf8");

  assert.match(sql, /configuration_snapshot_json JSON/);
  assert.match(sql, /baseline_state_json JSON/);
  assert.match(sql, /outcome_json JSON/);
  assert.match(sql, /reset_by_user_id BIGINT UNSIGNED/);
  assert.match(sql, /reset_at DATETIME\(3\)/);
  assert.match(
    sql,
    /FOREIGN KEY \(reset_by_user_id, university_id\)[\s\S]*REFERENCES users \(id, university_id\)/,
  );
});

test("simulation timeline is tenant-owned, ordered, attributed, and immutable", async () => {
  const sql = await readFile(upUrl, "utf8");

  assert.match(sql, /CREATE TABLE simulation_run_events/);
  assert.match(sql, /university_id BIGINT UNSIGNED NOT NULL/);
  assert.match(sql, /sequence_number INT UNSIGNED NOT NULL/);
  assert.match(sql, /UNIQUE KEY uq_simulation_run_events_sequence/);
  assert.match(
    sql,
    /FOREIGN KEY \(simulation_run_id, university_id\)[\s\S]*REFERENCES simulation_runs \(id, university_id\)/,
  );
  assert.match(sql, /BEFORE UPDATE ON simulation_run_events/);
  assert.match(sql, /BEFORE DELETE ON simulation_run_events/);
  assert.equal((sql.match(/SIGNAL SQLSTATE '45000'/g) ?? []).length, 2);
});

test("simulation experiment rollback removes timeline and run snapshots", async () => {
  const sql = await readFile(downUrl, "utf8");

  assert.match(sql, /DROP TABLE IF EXISTS simulation_run_events/);
  assert.match(sql, /DROP FOREIGN KEY fk_runs_reset_by/);
  assert.match(sql, /DROP COLUMN baseline_state_json/);
  assert.match(sql, /DROP COLUMN configuration_snapshot_json/);
});
