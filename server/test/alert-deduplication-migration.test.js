import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("active alert deduplication survives lifecycle status changes", async () => {
  const sql = await readFile(
    new URL("../migrations/009_active_alert_deduplication.up.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /status IN \('new', 'acknowledged', 'in_progress'\)/);
  assert.match(sql, /GENERATED ALWAYS AS/);
  assert.match(sql, /university_id, active_deduplication_key/);
  assert.match(sql, /last_triggered_at DATETIME\(3\)/);
});
