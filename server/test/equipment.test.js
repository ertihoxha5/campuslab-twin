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

test("equipment form options remain tenant and assignment scoped", async () => {
  const calls = [];
  const repository = createEquipmentRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("FROM laboratories laboratory")) {
        return [[{ id: 15, name: "Laboratori Test" }]];
      }
      if (sql.includes("FROM users")) {
        return [[{ id: 9, fullName: "Arta Berisha" }]];
      }
      return [[{ id: 3, name: "Zona Test" }]];
    },
  });

  const options = await repository.options({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    laboratoryId: "15",
  });

  assert.equal(options.laboratories[0].id, 15);
  assert.equal(options.zones[0].id, 3);
  assert.equal(options.users[0].id, 9);
  assert.match(calls[0].sql, /laboratory\.university_id = \?/);
  assert.match(calls[0].sql, /assignment\.user_id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", 1, "9"]);
  assert.deepEqual(calls[2].parameters, ["7", "15"]);
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

test("equipment detail, update and archive use only server tenant context", async () => {
  const calls = [];
  const service = createEquipmentService({
    repository: {
      async findById(input) {
        calls.push({ operation: "detail", input });
        return { id: "21", name: "Robot industrial" };
      },
      async update(input) {
        calls.push({ operation: "update", input });
        return { id: "21", ...input.equipment };
      },
      async archive(input) {
        calls.push({ operation: "archive", input });
        return { id: "21", name: "Robot industrial" };
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
    universityId: "999",
    laboratoryId: "15",
    name: "Robot industrial",
    code: "ROB-01",
    type: "Robotikë",
    status: "maintenance",
    healthScore: 80,
  };

  await service.detail("21", context);
  await service.update("21", input, context);
  await service.archive("21", context);

  assert.equal(calls[0].input.universityId, "7");
  assert.equal(calls[0].input.restrictToAssignments, true);
  assert.equal(calls[1].input.universityId, "7");
  assert.equal(calls[1].input.equipment.universityId, undefined);
  assert.equal(calls[2].input.universityId, "7");
});

test("equipment detail combines id, tenant and laboratory assignment scope", async () => {
  const calls = [];
  const repository = createEquipmentRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [[{ id: 21, name: "Robot industrial" }]];
    },
  });

  await repository.findById({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    equipmentId: "21",
  });

  assert.match(calls[0].sql, /equipment\.university_id = \?/);
  assert.match(calls[0].sql, /equipment\.id = \?/);
  assert.match(calls[0].sql, /assignment\.user_id = \?/);
  assert.deepEqual(calls[0].parameters, ["7", "21", 1, "9"]);
});

test("equipment update and archive are audited tenant transactions", async () => {
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
      if (sql.includes("SELECT equipment.id")) {
        return [[{ id: 21, name: "Robot industrial", code: "ROB-01" }]];
      }
      if (sql.includes("SELECT laboratory.id")) return [[{ id: 15 }]];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createEquipmentRepository({
    async getConnection() {
      return connection;
    },
  });
  const context = {
    universityId: "7",
    userId: "9",
    restrictToAssignments: false,
    equipmentId: "21",
    ipAddress: "127.0.0.1",
  };

  await repository.update({
    ...context,
    equipment: {
      laboratoryId: "15",
      zoneId: null,
      responsibleUserId: null,
      name: "Robot industrial",
      code: "ROB-01",
      type: "Robotikë",
      manufacturer: null,
      model: null,
      serialNumber: null,
      status: "maintenance",
      purchaseDate: null,
      warrantyExpiresAt: null,
      energyRatingWatts: 2500,
      healthScore: 80,
      object3dReference: null,
    },
  });
  await repository.archive(context);

  assert.deepEqual(events, [
    "begin",
    "commit",
    "release",
    "begin",
    "commit",
    "release",
  ]);
  assert.ok(
    calls.some(({ parameters }) => parameters.includes("equipment.updated")),
  );
  assert.ok(
    calls.some(({ parameters }) => parameters.includes("equipment.archived")),
  );
  for (const { sql, parameters } of calls.filter(({ sql }) =>
    /UPDATE equipment|FROM equipment/.test(sql),
  )) {
    assert.match(sql, /university_id = \?|equipment\.university_id = \?/);
    assert.ok(parameters.includes("7"));
    assert.ok(parameters.includes("21"));
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
        async options(_input, context) {
          return {
            laboratories: [{ id: "15", universityId: context.universityId }],
            zones: [],
            users: [],
          };
        },
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
        async detail(equipmentId, context) {
          return { id: equipmentId, universityId: context.universityId };
        },
        async update(equipmentId, input, context) {
          capturedContext = context;
          return { id: equipmentId, name: input.name };
        },
        async archive(equipmentId, context) {
          capturedContext = context;
          return { id: equipmentId, name: "Pajisja" };
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

  const optionsResponse = await fetch(`${baseUrl}/api/equipment/options`, {
    headers: { "x-test-manage": "true" },
  });
  const optionsPayload = await optionsResponse.json();
  assert.equal(optionsResponse.status, 200);
  assert.equal(optionsPayload.data.laboratories[0].universityId, "7");

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

  const detailResponse = await fetch(`${baseUrl}/api/equipment/21`);
  const detailPayload = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detailPayload.data.equipment.universityId, "7");

  const updateResponse = await fetch(`${baseUrl}/api/equipment/21`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-test-manage": "true",
    },
    body: JSON.stringify({ name: "Pajisja e përditësuar" }),
  });
  assert.equal(updateResponse.status, 200);

  const archiveResponse = await fetch(`${baseUrl}/api/equipment/21`, {
    method: "DELETE",
    headers: { "x-test-manage": "true" },
  });
  assert.equal(archiveResponse.status, 200);
  assert.equal(capturedContext.universityId, "7");
});
