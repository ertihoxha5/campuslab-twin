import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { createMaintenanceReminderRepository } from "../src/modules/maintenance/reminder-repository.js";
import { createMaintenanceReminderWorker } from "../src/modules/maintenance/reminder-worker.js";

test("maintenance notification migration links tasks and deduplicates per tenant user", async () => {
  const sql = await readFile(
    new URL("../migrations/012_maintenance_notifications.up.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /maintenance_task_id BIGINT UNSIGNED NULL/);
  assert.match(
    sql,
    /UNIQUE KEY uq_notifications_tenant_user_dedup\s*\(university_id, user_id, deduplication_key\)/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \(maintenance_task_id, university_id\)[\s\S]*REFERENCES maintenance_tasks \(id, university_id\)/,
  );
});

test("due reminder queries are tenant-derived, assigned-user scoped, and idempotent", async () => {
  const calls = [];
  const repository = createMaintenanceReminderRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [{ affectedRows: 1 }];
    },
  });

  const result = await repository.generateDueNotifications({ upcomingHours: 24 });

  assert.equal(result.upcomingAffected, 1);
  assert.equal(result.overdueAffected, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].parameters, [24]);
  for (const { sql } of calls) {
    assert.match(sql, /SELECT task\.university_id, task\.assigned_user_id/);
    assert.match(sql, /task\.status IN \('planned', 'in_progress', 'waiting'\)/);
    assert.match(sql, /ON DUPLICATE KEY UPDATE/);
  }
  assert.match(calls[0].sql, /'maintenance_upcoming'/);
  assert.match(calls[1].sql, /'maintenance_overdue'/);
});

test("maintenance reminder worker prevents overlapping runs and reports failures safely", async () => {
  let resolveRun;
  let calls = 0;
  const errors = [];
  const worker = createMaintenanceReminderWorker({
    repository: {
      generateDueNotifications() {
        calls += 1;
        return new Promise((resolve) => { resolveRun = resolve; });
      },
    },
    onError: (error) => errors.push(error),
  });

  const running = worker.runNow();
  assert.deepEqual(await worker.runNow(), {
    skipped: true,
    reason: "already_running",
  });
  resolveRun({ upcomingAffected: 0, overdueAffected: 0 });
  assert.deepEqual(await running, { upcomingAffected: 0, overdueAffected: 0 });
  assert.equal(calls, 1);
  assert.equal(errors.length, 0);
});
