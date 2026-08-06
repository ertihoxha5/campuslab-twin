import assert from "node:assert/strict";
import { test } from "node:test";

import { createEnergyAnomalyRepository } from "../src/modules/energy/anomaly-repository.js";
import { createEnergyAnomalyWorker } from "../src/modules/energy/anomaly-worker.js";

test("energy anomalies notify responsible and managing users without cross-tenant data", async () => {
  const calls = [];
  const repository = createEnergyAnomalyRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [{ affectedRows: 3 }];
    },
  });

  const result = await repository.generateAnomalyNotifications({
    thresholdMultiplier: 1.2,
    lookbackMinutes: 15,
  });

  assert.equal(result.affected, 3);
  assert.deepEqual(calls[0].parameters, [15, 1.2]);
  assert.match(calls[0].sql, /PARTITION BY reading\.university_id/);
  assert.match(calls[0].sql, /equipment\.energy_rating_watts \* \?/);
  assert.match(calls[0].sql, /role\.code = 'university_admin'/);
  assert.match(calls[0].sql, /role\.code = 'lab_manager'/);
  assert.match(calls[0].sql, /'energy_abnormal'/);
  assert.match(calls[0].sql, /ON DUPLICATE KEY UPDATE/);
});

test("energy anomaly worker prevents overlapping checks", async () => {
  let resolveRun;
  const worker = createEnergyAnomalyWorker({
    repository: {
      generateAnomalyNotifications() {
        return new Promise((resolve) => { resolveRun = resolve; });
      },
    },
  });

  const running = worker.runNow();
  assert.deepEqual(await worker.runNow(), {
    skipped: true,
    reason: "already_running",
  });
  resolveRun({ affected: 0 });
  assert.deepEqual(await running, { affected: 0 });
});
