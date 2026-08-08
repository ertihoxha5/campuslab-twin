import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createSimulatorRepository } from "../src/modules/simulator/repository.js";
import { createSimulatorService } from "../src/modules/simulator/service.js";

test("simulator service uses authenticated tenant context and rejects duplicate runs", async () => {
  const calls = [];
  const service = createSimulatorService({
    repository: {
      async start(input) {
        calls.push(input);
        return { duplicateRun: true };
      },
    },
  });

  await assert.rejects(
    service.start(
      "15",
      {
        universityId: "999",
        scenarioId: "4",
        samplingIntervalSeconds: "30",
      },
      {
        universityId: "7",
        userId: "9",
        roles: ["lab_manager"],
        ipAddress: "127.0.0.1",
      },
    ),
    (error) =>
      error.status === 409 && error.code === "SIMULATION_STATE_CONFLICT",
  );

  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].userId, "9");
  assert.equal(calls[0].laboratoryId, "15");
  assert.equal(calls[0].scenarioId, "4");
  assert.equal(calls[0].samplingIntervalSeconds, 30);
  assert.equal(calls[0].restrictToAssignments, true);
});

test("scenario preview is deterministic, tenant-scoped, and does not persist", async () => {
  const calls = [];
  const service = createSimulatorService({
    repository: {
      async previewSource(input) {
        calls.push(input);
        return {
          id: "4",
          name: "Rritje temperature",
          scenarioType: "temperature_rise",
          configuration: { ambientTemperature: 21 },
          seedValue: 741,
        };
      },
    },
  });
  const context = {
    universityId: "7",
    userId: "9",
    roles: ["lab_manager"],
    ipAddress: "127.0.0.1",
  };
  const input = {
    scenarioId: "4",
    overrides: { startTick: 2, durationTicks: 2, previewTicks: 4 },
  };

  const first = await service.preview("15", input, context);
  const second = await service.preview("15", input, context);

  assert.deepEqual(first, second);
  assert.equal(first.persisted, false);
  assert.equal(first.timeline.length, 4);
  assert.equal(first.timeline[1].event.type, "temperature_rise");
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].laboratoryId, "15");
  assert.equal(calls[0].scenarioId, "4");
});

test("simulation start locks the laboratory and persists one audited active run", async () => {
  const events = [];
  const calls = [];
  const connection = transactionConnection(events, calls, (sql) => {
    if (sql.includes("FROM laboratories laboratory")) return [[{ id: 15 }]];
    if (sql.includes("SELECT id") && sql.includes("FROM simulation_runs")) {
      return [[]];
    }
    if (sql.includes("FROM simulation_scenarios")) {
      return [
        [
          {
            id: 4,
            name: "Ditë normale",
            scenarioType: "energy_saving",
            configuration: JSON.stringify({ baselineOccupancy: 12 }),
            seedValue: 741,
          },
        ],
      ];
    }
    if (sql.includes("INSERT INTO simulation_runs")) {
      return [{ insertId: 51 }];
    }
    return [{ affectedRows: 1 }];
  });
  const repository = createSimulatorRepository({
    async getConnection() {
      return connection;
    },
  });

  const run = await repository.start({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    laboratoryId: "15",
    scenarioId: "4",
    samplingIntervalSeconds: 30,
    ipAddress: "127.0.0.1",
  });

  assert.equal(run.id, "51");
  assert.equal(run.status, "running");
  assert.equal(run.seedValue, 741);
  assert.deepEqual(run.input, {
    configuration: { baselineOccupancy: 12 },
    samplingIntervalSeconds: 30,
    generatorVersion: 1,
  });
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(
    calls.some(({ parameters }) => parameters.includes("simulation.started")),
  );
  assert.match(calls[0].sql, /assignment\.user_id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "15", 1, "9"]);
  assert.ok(
    calls
      .filter(({ sql }) => /simulation_runs|simulation_scenarios/.test(sql))
      .every(({ parameters }) => parameters.includes("7")),
  );
});

test("pause, resume and stop enforce deterministic persisted transitions", async () => {
  let currentStatus = "running";
  const events = [];
  const calls = [];
  const connection = transactionConnection(events, calls, (sql, parameters) => {
    if (sql.includes("FROM laboratories laboratory")) return [[{ id: 15 }]];
    if (sql.includes("SELECT run.id")) {
      return currentStatus === "stopped"
        ? [[]]
        : [
            [
              {
                id: 51,
                status: currentStatus,
                scenarioName: "Ditë normale",
              },
            ],
          ];
    }
    if (sql.includes("UPDATE simulation_runs")) {
      currentStatus = parameters[0];
    }
    return [{ affectedRows: 1 }];
  });
  const repository = createSimulatorRepository({
    async getConnection() {
      return connection;
    },
  });
  const context = {
    universityId: "7",
    userId: "9",
    restrictToAssignments: false,
    laboratoryId: "15",
    ipAddress: "127.0.0.1",
  };

  assert.equal(
    (await repository.transition({ ...context, action: "pause" })).status,
    "paused",
  );
  assert.equal(
    (await repository.transition({ ...context, action: "resume" })).status,
    "running",
  );
  assert.equal(
    (await repository.transition({ ...context, action: "stop" })).status,
    "stopped",
  );

  assert.deepEqual(events, [
    "begin",
    "commit",
    "release",
    "begin",
    "commit",
    "release",
    "begin",
    "commit",
    "release",
  ]);
  for (const action of [
    "simulation.paused",
    "simulation.resumed",
    "simulation.stopped",
  ]) {
    assert.ok(calls.some(({ parameters }) => parameters.includes(action)));
  }
  const stopUpdate = calls
    .filter(({ sql }) => sql.includes("UPDATE simulation_runs"))
    .at(-1);
  assert.match(stopUpdate.sql, /ended_at = UTC_TIMESTAMP\(3\)/);
});

test("status lookup is tenant and laboratory assignment scoped", async () => {
  const calls = [];
  const repository = createSimulatorRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("FROM laboratories laboratory")) {
        return [[{ id: 15 }]];
      }
      return [
        [
          {
            id: 51,
            laboratoryId: 15,
            scenarioId: 4,
            status: "paused",
            input: JSON.stringify({ samplingIntervalSeconds: 30 }),
            result: null,
          },
        ],
      ];
    },
  });

  const result = await repository.status({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    laboratoryId: "15",
  });

  assert.equal(result.run.status, "paused");
  assert.deepEqual(result.run.input, { samplingIntervalSeconds: 30 });
  assert.match(calls[0].sql, /assignment\.user_id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "15", 1, "9"]);
  assert.match(calls[1].sql, /run\.university_id = \?/);
  assert.match(calls[1].sql, /run\.laboratory_id = \?/);
  assert.deepEqual(calls[1].parameters, ["7", "15"]);
});

let server;
let baseUrl;
let captured;

before(async () => {
  const authenticateTenant = (request, _response, next) => {
    request.auth = {
      universityId: "7",
      userId: "9",
      roles: ["lab_manager"],
      permissions:
        request.headers["x-test-simulate"] === "true"
          ? ["simulations.run"]
          : ["laboratories.view"],
    };
    next();
  };
  const simulatorService = {
    async status(laboratoryId, context) {
      captured = { action: "status", laboratoryId, context };
      return { run: null };
    },
    async start(laboratoryId, input, context) {
      captured = { action: "start", laboratoryId, input, context };
      return { id: "51", status: "running" };
    },
    async preview(laboratoryId, input, context) {
      captured = { action: "preview", laboratoryId, input, context };
      return { persisted: false, timeline: [] };
    },
    async pause(laboratoryId, context) {
      captured = { action: "pause", laboratoryId, context };
      return { id: "51", status: "paused" };
    },
    async resume(laboratoryId, context) {
      captured = { action: "resume", laboratoryId, context };
      return { id: "51", status: "running" };
    },
    async stop(laboratoryId, context) {
      captured = { action: "stop", laboratoryId, context };
      return { id: "51", status: "stopped" };
    },
  };
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication: authenticateTenant,
      simulatorService,
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("simulator control routes require permission and derive tenant context", async () => {
  const forbidden = await fetch(
    `${baseUrl}/api/simulator/laboratories/15/status`,
  );
  assert.equal(forbidden.status, 403);

  const headers = {
    "content-type": "application/json",
    "x-test-simulate": "true",
  };
  const started = await fetch(
    `${baseUrl}/api/simulator/laboratories/15/start`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        universityId: "999",
        scenarioId: "4",
        samplingIntervalSeconds: 30,
      }),
    },
  );
  assert.equal(started.status, 201);
  assert.equal(captured.context.universityId, "7");
  assert.equal(captured.context.userId, "9");
  assert.equal(captured.laboratoryId, "15");

  const previewed = await fetch(
    `${baseUrl}/api/simulator/laboratories/15/preview`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ scenarioId: "4", overrides: {} }),
    },
  );
  assert.equal(previewed.status, 200);
  assert.equal(captured.action, "preview");
  assert.equal(captured.context.universityId, "7");

  for (const action of ["pause", "resume", "stop"]) {
    const response = await fetch(
      `${baseUrl}/api/simulator/laboratories/15/${action}`,
      { method: "POST", headers },
    );
    assert.equal(response.status, 200);
    assert.equal(captured.action, action);
    assert.equal(captured.context.universityId, "7");
  }
});

function transactionConnection(events, calls, execute) {
  return {
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
      return execute(sql, parameters);
    },
  };
}
