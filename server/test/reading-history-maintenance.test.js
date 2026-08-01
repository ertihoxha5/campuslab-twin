import assert from "node:assert/strict";
import { test } from "node:test";
import { createReadingHistoryMaintenance } from "../src/modules/simulator/history-maintenance.js";
import { createReadingHistoryRepository } from "../src/modules/simulator/history-repository.js";

test("history maintenance aggregates before pruning in one locked transaction", async () => {
  const events = [];
  const calls = [];
  const connection = {
    async beginTransaction() {
      events.push("begin");
    },
    async commit() {
      events.push("commit");
    },
    async rollback() {
      events.push("rollback");
    },
    release() {
      events.push("release");
    },
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
      return [{ affectedRows: 3 }];
    },
  };
  const repository = createReadingHistoryRepository({
    async getConnection() {
      return connection;
    },
  });

  const result = await repository.aggregateAndPrune({
    cutoff: "2026-07-02 10:00:00.000",
    intervalMinutes: 60,
  });

  assert.equal(result.deletedSensorReadings, 3);
  assert.deepEqual(events, ["begin", "commit", "release"]);
  const sensorAggregate = calls.find(({ sql }) =>
    sql.includes("INSERT INTO sensor_reading_aggregates"),
  );
  assert.match(sensorAggregate.sql, /GROUP BY university_id, laboratory_id/);
  assert.deepEqual(sensorAggregate.parameters, ["2026-07-02 10:00:00.000"]);
  assert.match(sensorAggregate.sql, /interval_minutes, source/);
  const firstDelete = calls.findIndex(({ sql }) =>
    sql.includes("DELETE FROM sensor_readings"),
  );
  const lastAggregate = calls.findIndex(({ sql }) =>
    sql.includes("INSERT INTO energy_reading_aggregates"),
  );
  assert.ok(firstDelete > lastAggregate);
});

test("history maintenance lock prevents duplicate workers", async () => {
  let began = false;
  const repository = createReadingHistoryRepository({
    async getConnection() {
      return {
        async execute() {
          return [[{ acquired: 0 }]];
        },
        async beginTransaction() {
          began = true;
        },
        release() {},
      };
    },
  });

  assert.deepEqual(
    await repository.aggregateAndPrune({
      cutoff: "2026-07-02 10:00:00.000",
      intervalMinutes: 60,
    }),
    { skipped: true },
  );
  assert.equal(began, false);
});

test("scheduler uses configured retention and prevents overlapping runs", async () => {
  const calls = [];
  const timers = [];
  let releaseFirstRun;
  const firstRun = new Promise((resolve) => {
    releaseFirstRun = resolve;
  });
  const repository = {
    async aggregateAndPrune(input) {
      calls.push(input);
      if (calls.length === 1) await firstRun;
      return { skipped: false };
    },
  };
  const maintenance = createReadingHistoryMaintenance({
    repository,
    retentionDays: 30,
    aggregationIntervalMinutes: 60,
    maintenanceIntervalMinutes: 15,
    clock: () => new Date("2026-08-01T10:00:00.000Z"),
    setIntervalFunction(callback, milliseconds) {
      timers.push({ callback, milliseconds });
      return timers.at(-1);
    },
    clearIntervalFunction() {},
  });

  const running = maintenance.runNow();
  assert.deepEqual(await maintenance.runNow(), {
    skipped: true,
    reason: "already_running",
  });
  releaseFirstRun();
  await running;
  assert.equal(await maintenance.start(), true);
  assert.equal(timers[0].milliseconds, 15 * 60 * 1000);
  assert.deepEqual(calls[0], {
    cutoff: "2026-07-02 10:00:00.000",
    intervalMinutes: 60,
  });
});
