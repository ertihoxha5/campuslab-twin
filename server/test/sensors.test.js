import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createSensorRepository } from "../src/modules/sensors/repository.js";
import {
  createSensorService,
  sensorUnits,
} from "../src/modules/sensors/service.js";

const validSensor = {
  laboratoryId: "15",
  zoneId: "3",
  equipmentId: "21",
  name: "Sensori i temperaturës",
  code: "temp-01",
  sensorType: "temperature",
  unit: "°C",
  status: "online",
  samplingIntervalSeconds: "30",
  warningMin: "15",
  warningMax: "28",
  criticalMin: "10",
  criticalMax: "35",
  calibratedAt: "2026-01-10T10:00",
  calibrationDueAt: "2027-01-10T10:00",
  positionX: "1.5",
  positionY: "1.2",
  positionZ: "-0.8",
  rotationX: "0",
  rotationY: "90",
  rotationZ: "0",
};

test("sensor types expose their required physical units", () => {
  assert.deepEqual(sensorUnits, {
    temperature: "°C",
    humidity: "%",
    co2: "ppm",
    occupancy: "persona",
    smoke: "%",
    power: "W",
    voltage: "V",
    equipment_health: "%",
  });
});

test("sensor creation normalizes values and uses only server tenant context", async () => {
  let captured;
  const service = createSensorService({
    repository: {
      async create(input) {
        captured = input;
        return { id: "31", ...input.sensor };
      },
    },
  });

  const result = await service.create(
    { ...validSensor, universityId: "999" },
    {
      universityId: "7",
      userId: "9",
      roles: ["lab_manager"],
      ipAddress: "127.0.0.1",
    },
  );

  assert.equal(result.code, "TEMP-01");
  assert.equal(result.samplingIntervalSeconds, 30);
  assert.equal(result.positionX, 1.5);
  assert.equal(captured.universityId, "7");
  assert.equal(captured.restrictToAssignments, true);
  assert.equal(captured.sensor.universityId, undefined);
});

test("sensor unit, thresholds and calibration dates must match their rules", async () => {
  const service = createSensorService({
    repository: { async create() {} },
  });
  const context = {
    universityId: "7",
    userId: "9",
    roles: ["university_admin"],
  };

  for (const invalid of [
    { ...validSensor, unit: "ppm" },
    { ...validSensor, warningMin: "30", warningMax: "20" },
    { ...validSensor, criticalMin: "18", warningMin: "15" },
    { ...validSensor, criticalMax: "25", warningMax: "28" },
    {
      ...validSensor,
      calibratedAt: "2027-01-10T10:00",
      calibrationDueAt: "2026-01-10T10:00",
    },
  ]) {
    await assert.rejects(
      service.create(invalid, context),
      (error) =>
        error.status === 422 &&
        error.code === "VALIDATION_ERROR" &&
        Object.keys(error.details).length > 0,
    );
  }
});

test("sensor list is tenant-scoped, assignment-scoped, filtered and safely sorted", async () => {
  const calls = [];
  const repository = createSensorRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [[{ id: 31, name: "Sensori i temperaturës" }]];
    },
  });

  const result = await repository.list({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    laboratoryId: "15",
    sensorType: "temperature",
    status: "online",
    search: "TEMP",
    sort: "updatedAt",
    direction: "desc",
    limit: 20,
    offset: 0,
  });

  assert.equal(result.total, 1);
  assert.match(calls[0].sql, /sensor\.university_id = \?/);
  assert.match(calls[0].sql, /assignment\.user_id = \?/);
  assert.match(calls[0].sql, /ORDER BY sensor\.updated_at DESC/);
  assert.deepEqual(calls[0].parameters.slice(0, 3), ["7", 1, "9"]);
  assert.ok(calls[0].parameters.includes("15"));
  assert.ok(calls[0].parameters.includes("temperature"));
});

test("sensor options and creation validate laboratory, zone and equipment in one tenant", async () => {
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
      if (sql.includes("SELECT laboratory.id")) return [[{ id: 15 }]];
      if (sql.includes("FROM laboratory_zones")) return [[{ id: 3 }]];
      if (sql.includes("FROM equipment")) return [[{ id: 21 }]];
      if (sql.includes("INSERT INTO sensors")) return [{ insertId: 31 }];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createSensorRepository({
    async getConnection() {
      return connection;
    },
  });

  const service = createSensorService({ repository });
  const result = await service.create(validSensor, {
    universityId: "7",
    userId: "9",
    roles: ["university_admin"],
    ipAddress: "127.0.0.1",
  });

  assert.equal(result.id, "31");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("'sensor.created'")));
  for (const call of calls.filter(({ sql }) =>
    /FROM laboratories|FROM laboratory_zones|FROM equipment/.test(sql),
  )) {
    assert.ok(call.parameters.includes("7"));
    assert.ok(call.parameters.includes("15"));
  }
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
        async list(_input, context) {
          return {
            items: [{ id: "31", universityId: context.universityId }],
            pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
          };
        },
        async options(_input, context) {
          return {
            laboratories: [{ id: "15", universityId: context.universityId }],
            zones: [],
            equipment: [],
          };
        },
        async create(input, context) {
          capturedContext = context;
          return { id: "31", name: input.name };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("sensor routes enforce read and asset management permissions", async () => {
  const listResponse = await fetch(`${baseUrl}/api/sensors`);
  const listPayload = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.data.sensors[0].universityId, "7");

  const forbidden = await fetch(`${baseUrl}/api/sensors`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Sensor" }),
  });
  assert.equal(forbidden.status, 403);

  const optionsResponse = await fetch(`${baseUrl}/api/sensors/options`, {
    headers: { "x-test-manage": "true" },
  });
  assert.equal(optionsResponse.status, 200);

  const createResponse = await fetch(`${baseUrl}/api/sensors`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-manage": "true",
    },
    body: JSON.stringify({ universityId: "999", name: "Sensor" }),
  });
  assert.equal(createResponse.status, 201);
  assert.equal(capturedContext.universityId, "7");
  assert.equal(capturedContext.userId, "9");
});
