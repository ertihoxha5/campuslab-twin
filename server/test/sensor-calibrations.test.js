import assert from "node:assert/strict";
import fs from "node:fs";
import { once } from "node:events";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createSensorRepository } from "../src/modules/sensors/repository.js";
import { createSensorService } from "../src/modules/sensors/service.js";

const directory = path.dirname(fileURLToPath(import.meta.url));

test("sensor calibration migration is tenant-owned and safely reversible", () => {
  const up = fs.readFileSync(
    path.resolve(
      directory,
      "../migrations/006_sensor_calibration_history.up.sql",
    ),
    "utf8",
  );
  const down = fs.readFileSync(
    path.resolve(
      directory,
      "../migrations/006_sensor_calibration_history.down.sql",
    ),
    "utf8",
  );

  assert.match(up, /CREATE TABLE sensor_calibrations/i);
  assert.match(up, /university_id BIGINT UNSIGNED NOT NULL/i);
  assert.match(up, /FOREIGN KEY \(sensor_id, university_id\)/i);
  assert.match(up, /FOREIGN KEY \(performed_by_user_id, university_id\)/i);
  assert.match(up, /calibration_due_at > calibrated_at/i);
  assert.match(down, /DROP TABLE IF EXISTS sensor_calibrations/i);
});

test("calibration service validates dates and ignores browser tenant and performer", async () => {
  let captured;
  const service = createSensorService({
    repository: {
      async createCalibration(input) {
        captured = input;
        return { id: "41", ...input.calibration };
      },
    },
  });
  const context = {
    universityId: "7",
    userId: "9",
    roles: ["lab_manager"],
    ipAddress: "127.0.0.1",
  };

  await assert.rejects(
    service.recordCalibration(
      "31",
      {
        result: "passed",
        calibratedAt: "2027-01-10T10:00:00Z",
        calibrationDueAt: "2026-01-10T10:00:00Z",
      },
      context,
    ),
    (error) => error.status === 422,
  );

  const result = await service.recordCalibration(
    "31",
    {
      universityId: "999",
      performedByUserId: "888",
      result: "adjusted",
      calibratedAt: "2026-01-10T10:00:00Z",
      calibrationDueAt: "2027-01-10T10:00:00Z",
      notes: "U rregullua devijimi.",
    },
    context,
  );

  assert.equal(result.id, "41");
  assert.equal(captured.universityId, "7");
  assert.equal(captured.userId, "9");
  assert.equal(captured.restrictToAssignments, true);
  assert.equal(captured.calibration.universityId, undefined);
  assert.equal(captured.calibration.performedByUserId, undefined);
  assert.equal(captured.calibration.calibratedAt, "2026-01-10 10:00:00.000");
});

test("calibration creation updates the sensor and audit in one tenant transaction", async () => {
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
      if (sql.includes("SELECT sensor.id")) {
        return [
          [
            {
              id: 31,
              laboratoryId: 15,
              name: "Sensori i temperaturës",
              code: "TEMP-01",
            },
          ],
        ];
      }
      if (sql.includes("INSERT INTO sensor_calibrations")) {
        return [{ insertId: 41 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createSensorRepository({
    async getConnection() {
      return connection;
    },
  });

  const result = await repository.createCalibration({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    sensorId: "31",
    ipAddress: "127.0.0.1",
    calibration: {
      result: "passed",
      calibratedAt: "2026-01-10 10:00:00.000",
      calibrationDueAt: "2027-01-10 10:00:00.000",
      notes: null,
    },
  });

  assert.equal(result.id, "41");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("sensor_calibrations")));
  assert.ok(calls.some(({ sql }) => sql.includes("UPDATE sensors")));
  assert.ok(
    calls.some(({ parameters }) => parameters.includes("sensor.calibrated")),
  );
  for (const call of calls) {
    if (/sensor_calibrations|UPDATE sensors|FROM sensors/.test(call.sql)) {
      assert.ok(call.parameters.includes("7"));
      assert.ok(call.parameters.includes("31"));
    }
  }
});

test("calibration history remains sensor, tenant and assignment scoped", async () => {
  const calls = [];
  const repository = createSensorRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("SELECT sensor.id")) {
        return [
          [
            {
              id: 31,
              laboratoryId: 15,
              name: "Sensori i temperaturës",
            },
          ],
        ];
      }
      return [[{ id: 41, result: "passed" }]];
    },
  });

  const result = await repository.listCalibrations({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    sensorId: "31",
  });

  assert.equal(result[0].id, 41);
  assert.match(calls[0].sql, /assignment\.user_id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "31", 1, "9"]);
  assert.match(calls[1].sql, /calibration\.university_id = \?/);
  assert.match(calls[1].sql, /calibration\.sensor_id = \?/);
  assert.deepEqual(calls[1].parameters, ["7", "31"]);
});

let server;
let baseUrl;
let capturedContext;

before(async () => {
  const authenticateTenant = (request, _response, next) => {
    request.auth = {
      universityId: "7",
      userId: "9",
      roles: ["university_admin"],
      permissions:
        request.headers["x-test-manage"] === "true"
          ? ["laboratories.view", "assets.manage"]
          : ["laboratories.view"],
    };
    next();
  };
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication: authenticateTenant,
      sensorService: {
        async calibrations(_sensorId, context) {
          return [{ id: "41", universityId: context.universityId }];
        },
        async recordCalibration(sensorId, input, context) {
          capturedContext = context;
          return { id: "41", sensorId, result: input.result };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("calibration routes enforce read and asset management permissions", async () => {
  const listResponse = await fetch(`${baseUrl}/api/sensors/31/calibrations`);
  const listPayload = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.data.calibrations[0].universityId, "7");

  const forbidden = await fetch(`${baseUrl}/api/sensors/31/calibrations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ result: "passed" }),
  });
  assert.equal(forbidden.status, 403);

  const created = await fetch(`${baseUrl}/api/sensors/31/calibrations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-manage": "true",
    },
    body: JSON.stringify({
      universityId: "999",
      result: "passed",
      calibratedAt: "2026-01-10T10:00:00Z",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(capturedContext.universityId, "7");
  assert.equal(capturedContext.userId, "9");
});
