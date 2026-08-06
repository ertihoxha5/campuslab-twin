import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("energy settings are tenant-owned with a non-negative configurable tariff", async () => {
  const sql = await readFile(
    new URL("../migrations/013_university_energy_settings.up.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE university_energy_settings/);
  assert.match(sql, /PRIMARY KEY \(university_id\)/);
  assert.match(sql, /tariff_per_kwh DECIMAL\(12,4\) NOT NULL/);
  assert.match(sql, /CHECK \(tariff_per_kwh >= 0\)/);
  assert.match(
    sql,
    /FOREIGN KEY \(updated_by_user_id, university_id\)[\s\S]*REFERENCES users \(id, university_id\)/,
  );
});
