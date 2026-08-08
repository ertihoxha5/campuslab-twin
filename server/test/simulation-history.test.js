import assert from "node:assert/strict";
import { test } from "node:test";
import { createSimulatorRepository } from "../src/modules/simulator/repository.js";
import { createSimulatorService } from "../src/modules/simulator/service.js";

const access = {
  universityId: "7",
  userId: "9",
  restrictToAssignments: true,
  laboratoryId: "15",
};

test("scenario catalog and run history are tenant and laboratory scoped", async () => {
  const calls = [];
  const repository = createSimulatorRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("FROM laboratories laboratory")) return [[{ id: 15 }]];
      if (
        sql.includes("FROM simulation_scenarios") &&
        sql.includes("ORDER BY name")
      ) {
        return [
          [
            {
              id: 4,
              name: "Rritje temperature",
              scenarioType: "temperature_rise",
              configuration: JSON.stringify({ ambientTemperature: 21 }),
              status: "active",
            },
          ],
        ];
      }
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      if (sql.includes("FROM simulation_runs run")) {
        return [
          [
            {
              id: 51,
              laboratoryId: 15,
              scenarioId: 4,
              scenarioName: "Rritje temperature",
              scenarioType: "temperature_rise",
              status: "stopped",
              startedByUserId: 9,
              readingCount: "12",
              energyReadingCount: "6",
            },
          ],
        ];
      }
      return [[]];
    },
  });

  const scenarios = await repository.scenarios(access);
  const runs = await repository.runs({
    ...access,
    status: "stopped",
    limit: 20,
    offset: 0,
  });

  assert.equal(scenarios.scenarios[0].id, "4");
  assert.deepEqual(scenarios.scenarios[0].configuration, {
    ambientTemperature: 21,
  });
  assert.equal(runs.items[0].readingCount, 12);
  assert.equal(runs.total, 1);
  const runQueries = calls.filter(({ sql }) =>
    sql.includes("FROM simulation_runs run"),
  );
  assert.ok(runQueries.every(({ parameters }) => parameters[0] === "7"));
  assert.ok(runQueries.every(({ parameters }) => parameters[1] === "15"));
  assert.ok(
    runQueries.every(({ parameters }) => parameters.includes("stopped")),
  );
});

test("run detail returns ordered immutable timeline only inside its tenant laboratory", async () => {
  const calls = [];
  const repository = createSimulatorRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("FROM laboratories laboratory")) return [[{ id: 15 }]];
      if (sql.includes("FROM simulation_run_events")) {
        return [
          [
            {
              id: 101,
              userId: 9,
              eventType: "started",
              sequenceNumber: 1,
              eventData: JSON.stringify({ baselineState: { tick: 0 } }),
            },
            {
              id: 102,
              userId: null,
              eventType: "reading_generated",
              sequenceNumber: 2,
              eventData: JSON.stringify({ readingCount: 3 }),
            },
          ],
        ];
      }
      if (sql.includes("FROM simulation_runs run")) {
        return [
          [
            {
              id: 51,
              laboratoryId: 15,
              scenarioId: 4,
              status: "stopped",
              input: JSON.stringify({ samplingIntervalSeconds: 30 }),
              result: JSON.stringify({ readingCount: 3 }),
              configurationSnapshot: JSON.stringify({ equipmentLoad: 0.5 }),
              baselineState: JSON.stringify({ tick: 0 }),
              outcome: JSON.stringify({ baselineRestored: true }),
            },
          ],
        ];
      }
      return [[]];
    },
  });

  const run = await repository.runDetail({ ...access, runId: "51" });

  assert.equal(run.id, "51");
  assert.deepEqual(run.baselineState, { tick: 0 });
  assert.deepEqual(run.timeline[0].eventData, {
    baselineState: { tick: 0 },
  });
  const detailQuery = calls.find(({ sql }) =>
    sql.includes("WHERE run.university_id = ?"),
  );
  assert.deepEqual(detailQuery.parameters, ["7", "15", "51"]);
  const timelineQuery = calls.find(({ sql }) =>
    sql.includes("FROM simulation_run_events"),
  );
  assert.match(timelineQuery.sql, /ORDER BY sequence_number, id/);
  assert.deepEqual(timelineQuery.parameters, ["7", "51"]);
});

test("run history service validates filters and calculates pagination", async () => {
  const calls = [];
  const service = createSimulatorService({
    repository: {
      async runs(input) {
        calls.push(input);
        return { items: [{ id: "51" }], total: 21 };
      },
    },
  });
  const result = await service.runs(
    "15",
    { status: "stopped", page: "2", pageSize: "10" },
    { universityId: "7", userId: "9", roles: ["lab_manager"] },
  );

  assert.equal(result.pagination.totalPages, 3);
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].laboratoryId, "15");
  assert.equal(calls[0].limit, 10);
  assert.equal(calls[0].offset, 10);
  await assert.rejects(
    service.runs(
      "15",
      { status: "invented" },
      { universityId: "7", userId: "9", roles: [] },
    ),
    (error) => error.status === 422 && error.code === "VALIDATION_ERROR",
  );
});
