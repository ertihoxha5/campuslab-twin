import assert from "node:assert/strict";
import { test } from "node:test";
import { createSimulationCoordinator } from "../src/modules/simulator/coordinator.js";
import { createSimulatorRepository } from "../src/modules/simulator/repository.js";
import { createSimulatorService } from "../src/modules/simulator/service.js";

const runtime = {
  id: "51",
  universityId: "7",
  laboratoryId: "15",
  status: "running",
  seedValue: 741,
  input: {
    samplingIntervalSeconds: 30,
    configuration: { baselineOccupancy: 8, equipmentLoad: 0.7 },
  },
  result: {},
  sensors: [
    { id: "1", sensorType: "temperature", unit: "°C" },
    { id: "2", sensorType: "power", unit: "W" },
  ],
  equipment: [
    { id: "21", energyRatingWatts: 3000, healthScore: 95 },
    { id: "22", energyRatingWatts: 1000, healthScore: 85 },
  ],
};

test("coordinator persists simulated sensor and per-equipment energy readings", async () => {
  const persisted = [];
  const repository = {
    async loadRuntime() {
      return structuredClone(runtime);
    },
    async persistStep(step) {
      persisted.push(step);
      return true;
    },
    async markFailed() {
      assert.fail("a valid tick must not fail");
    },
  };
  const coordinator = createSimulationCoordinator({
    repository,
    clock: () => new Date("2026-08-01T10:00:00.000Z"),
  });

  const saved = await coordinator.runOnce({
    universityId: "7",
    laboratoryId: "15",
    runId: "51",
  });

  assert.equal(saved, true);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].readings.length, 2);
  assert.ok(
    persisted[0].readings.every((reading) => reading.source === "simulated"),
  );
  assert.deepEqual(
    persisted[0].energyReadings.map((reading) => reading.equipmentId),
    ["21", "22"],
  );
  assert.equal(
    persisted[0].energyReadings[0].powerWatts,
    persisted[0].energyReadings[1].powerWatts * 3,
  );
  assert.equal(persisted[0].recordedAt, "2026-08-01 10:00:00.000");
  assert.equal(persisted[0].generatorState.tick, 1);
});

test("coordinator prevents duplicate timers and restores only running processes", async () => {
  const timers = [];
  const cleared = [];
  const repository = {
    async recoverableRuns() {
      return [
        { ...runtime, id: "51", status: "running" },
        {
          ...runtime,
          id: "52",
          laboratoryId: "16",
          status: "paused",
        },
      ];
    },
    async loadRuntime(reference) {
      return reference.laboratoryId === "15"
        ? { ...structuredClone(runtime), ...reference, status: "running" }
        : { ...structuredClone(runtime), ...reference, status: "paused" };
    },
  };
  const coordinator = createSimulationCoordinator({
    repository,
    setIntervalFunction(callback, milliseconds) {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    clearIntervalFunction(timer) {
      cleared.push(timer);
    },
  });

  assert.deepEqual(await coordinator.restore(), { found: 2, restored: 1 });
  assert.equal(coordinator.activeCount(), 1);
  assert.equal(timers[0].milliseconds, 30000);
  assert.equal(
    await coordinator.activate({
      universityId: "7",
      laboratoryId: "15",
      runId: "51",
    }),
    false,
  );
  assert.equal(timers.length, 1);
  assert.equal(
    coordinator.pause({ universityId: "7", laboratoryId: "15" }),
    true,
  );
  assert.equal(coordinator.activeCount(), 0);
  assert.equal(cleared.length, 1);
});

test("runtime persistence is atomic and tenant-scoped", async () => {
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
      if (sql.includes("SELECT id, result_json")) {
        return [[{ id: 51, result: JSON.stringify({ readingCount: 2 }) }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createSimulatorRepository({
    async getConnection() {
      return connection;
    },
  });

  const saved = await repository.persistStep({
    universityId: "7",
    laboratoryId: "15",
    runId: "51",
    readings: [{ sensorId: "1", value: 22.4 }],
    energyReadings: [
      { equipmentId: "21", powerWatts: 2100, energyKwh: 0.0175 },
    ],
    generatorState: { tick: 3, values: { temperature: 22.4 } },
    event: null,
    recordedAt: "2026-08-01 10:00:00.000",
  });

  assert.equal(saved, true);
  assert.deepEqual(events, ["begin", "commit", "release"]);
  const sensorInsert = calls.find(({ sql }) =>
    sql.includes("INSERT INTO sensor_readings"),
  );
  assert.match(sensorInsert.sql, /'simulated'/);
  assert.deepEqual(sensorInsert.parameters, [
    "7",
    "15",
    "1",
    22.4,
    "2026-08-01 10:00:00.000",
    "51",
  ]);
  const energyInsert = calls.find(({ sql }) =>
    sql.includes("INSERT INTO energy_readings"),
  );
  assert.match(energyInsert.sql, /'simulated'/);
  assert.ok(calls.every(({ parameters }) => parameters.includes("7")));
  const update = calls.at(-1);
  const result = JSON.parse(update.parameters[0]);
  assert.equal(result.readingCount, 3);
  assert.equal(result.energyReadingCount, 1);
  assert.equal(result.generatorState.tick, 3);
});

test("service lifecycle synchronizes timers only after persisted transitions", async () => {
  const events = [];
  const repository = {
    async start() {
      events.push("db:start");
      return { id: "51", status: "running" };
    },
    async transition({ action }) {
      events.push(`db:${action}`);
      return {
        id: "51",
        status: { pause: "paused", resume: "running", stop: "stopped" }[action],
      };
    },
  };
  const coordinator = {
    async activate() {
      events.push("timer:start");
    },
    async pause() {
      events.push("timer:pause");
    },
    async resume() {
      events.push("timer:resume");
    },
    async stop() {
      events.push("timer:stop");
    },
  };
  const service = createSimulatorService({ repository, coordinator });
  const context = {
    universityId: "7",
    userId: "9",
    roles: ["university_admin"],
  };

  await service.start("15", { scenarioId: "4" }, context);
  await service.pause("15", context);
  await service.resume("15", context);
  await service.stop("15", context);

  assert.deepEqual(events, [
    "db:start",
    "timer:start",
    "db:pause",
    "timer:pause",
    "db:resume",
    "timer:resume",
    "db:stop",
    "timer:stop",
  ]);
});
