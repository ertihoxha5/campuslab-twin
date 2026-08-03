import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("alert status history is tenant owned and attributed to a user", async () => {
  const sql = await readFile(
    new URL("../migrations/010_alert_status_history.up.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /CREATE TABLE alert_status_updates/);
  assert.match(sql, /university_id BIGINT UNSIGNED NOT NULL/);
  assert.match(sql, /changed_by_user_id BIGINT UNSIGNED NOT NULL/);
  assert.match(sql, /from_status ENUM/);
  assert.match(sql, /to_status ENUM/);
  assert.match(sql, /notes TEXT NULL/);
});
