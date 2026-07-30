import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createEquipmentRepository } from "../src/modules/equipment/repository.js";
import { createEquipmentService } from "../src/modules/equipment/service.js";

test("equipment list is tenant-scoped and restricted to assigned laboratories", async () => {
  const calls = [];
  const repository = createEquipmentRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [[{ id: 21, name: "Roboti industrial" }]];
    },
  });

  const result = await repository.list({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    laboratoryId: "15",
    status: "active",
    search: "Robot",
    limit: 20,
    offset: 0,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, 21);
  for (const call of calls) {
    assert.match(call.sql, /equipment\.university_id = \?/);
    assert.match(call.sql, /assignment\.user_id = \?/);
    assert.equal(call.parameters[0], "7");
    assert.equal(call.parameters[1], 1);
    assert.equal(call.parameters[2], "9");
  }
});

test("equipment creation normalizes values and ignores browser tenant identity", async () => {
  const calls = [];
  const service = createEquipmentService({
    repository: {
      async create(input) {
        calls.push(input);
        return { id: "21", ...input.equipment };
      },
    },
  });

  const equipment = await service.create(
    {
      universityId: "999",
      laboratoryId: "15",
      name: " Robot industrial ",
      code: "rob-01",
      type: "Robotikë",
      energyRatingWatts: "2500",
      healthScore: "96.5",
    },
    {
      universityId: "7",
      userId: "9",
      roles: ["lab_manager"],
      ipAddress: "127.0.0.1",
    },
  );

  assert.equal(equipment.code, "ROB-01");
  assert.equal(equipment.energyRatingWatts, 2500);
  assert.equal(equipment.healthScore, 96.5);
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].restrictToAssignments, true);
  assert.equal(calls[0].equipment.universityId, undefined);
});

test("equipment creation validates laboratory, zone and responsible user ownership", async () => {
  const input = {
    laboratoryId: "15",
    name: "Pajisja testuese",
    code: "TEST-01",
    type: "Test",
  };
  for (const invalidResult of [
    { invalidLaboratory: true },
    { invalidZone: true },
    { invalidResponsibleUser: true },
  ]) {
    const service = createEquipmentService({
      repository: {
        async create() {
          return invalidResult;
        },
      },
    });
    await assert.rejects(
      service.create(input, {
        universityId: "7",
        userId: "9",
        roles: ["university_admin"],
      }),
      (error) => error.status === 422,
    );
  }
});

test("equipment creation and audit are one tenant transaction", async () => {
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
      if (sql.includes("SELECT id") && sql.includes("laboratory_zones")) {
        return [[{ id: 3 }]];
      }
      if (sql.includes("SELECT id") && sql.includes("FROM users")) {
        return [[{ id: 9 }]];
      }
      if (sql.includes("INSERT INTO equipment")) return [{ insertId: 21 }];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createEquipmentRepository({
    async getConnection() {
      return connection;
    },
  });

  const equipment = await repository.create({
    universityId: "7",
    userId: "9",
    restrictToAssignments: false,
    ipAddress: "127.0.0.1",
    equipment: {
      laboratoryId: "15",
      zoneId: "3",
      responsibleUserId: "9",
      name: "Robot industrial",
      code: "ROB-01",
      type: "Robotikë",
      manufacturer: "Prodhuesi",
      model: "R-1",
      serialNumber: "SER-01",
      status: "active",
      purchaseDate: "2026-01-10",
      warrantyExpiresAt: "2028-01-10",
      energyRatingWatts: 2500,
      healthScore: 96,
      object3dReference: "robot-industrial.glb",
    },
  });

  assert.equal(equipment.id, "21");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("'equipment.created'")));
  for (const { sql, parameters } of calls.filter(({ sql }) =>
    /FROM laboratories|FROM laboratory_zones|FROM users/.test(sql),
  )) {
    assert.match(sql, /university_id = \?|university_id = laboratory/);
    assert.ok(parameters.includes("7"));
  }
});

let server;
let baseUrl;
let capturedContext;

before(async () => {
  const authenticateTenant = (request, _response, next) => {
    request.auth = {
      accountType: "university",
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
      equipmentService: {
        async list(_input, context) {
          return {
            items: [{ id: "21", universityId: context.universityId }],
            pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
          };
        },
        async create(input, context) {
          capturedContext = context;
          return { id: "22", name: input.name };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("equipment routes derive tenant context and enforce asset permissions", async () => {
  const listResponse = await fetch(`${baseUrl}/api/equipment`);
  const listPayload = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.data.equipment[0].universityId, "7");

  const forbidden = await fetch(`${baseUrl}/api/equipment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Pajisje" }),
  });
  assert.equal(forbidden.status, 403);

  const allowed = await fetch(`${baseUrl}/api/equipment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-manage": "true",
    },
    body: JSON.stringify({ universityId: "999", name: "Pajisje" }),
  });
  assert.equal(allowed.status, 201);
  assert.equal(capturedContext.universityId, "7");
  assert.equal(capturedContext.userId, "9");
});
