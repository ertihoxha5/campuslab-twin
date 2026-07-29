import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createLaboratoryRepository } from "../src/modules/laboratories/repository.js";
import { createLaboratoryService } from "../src/modules/laboratories/service.js";

test("laboratory list is tenant-scoped and restricted to assignments", async () => {
  const calls = [];
  const pool = {
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [[{ id: 11, name: "Laboratori i Rrjeteve" }]];
    },
  };
  const repository = createLaboratoryRepository(pool);

  const result = await repository.list({
    universityId: "7",
    userId: "9",
    restrictToAssignments: true,
    search: "Rrjete",
    status: "active",
    limit: 20,
    offset: 0,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, 11);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call.sql, /laboratory\.university_id = \?/);
    assert.match(call.sql, /assignment\.user_id = \?/);
    assert.equal(call.parameters[0], "7");
    assert.equal(call.parameters[1], 1);
    assert.equal(call.parameters[2], "9");
  }
});

test("university administrators list all tenant laboratories with pagination", async () => {
  const calls = [];
  const service = createLaboratoryService({
    repository: {
      async list(input) {
        calls.push(input);
        return { items: [{ id: "4" }], total: 21 };
      },
    },
  });

  const result = await service.list(
    { search: "Kimi", status: "maintenance", page: "2", pageSize: "10" },
    { universityId: "7", userId: "9", roles: ["university_admin"] },
  );

  assert.deepEqual(calls[0], {
    universityId: "7",
    userId: "9",
    restrictToAssignments: false,
    search: "Kimi",
    status: "maintenance",
    limit: 10,
    offset: 10,
  });
  assert.equal(result.pagination.pages, 3);
});

test("laboratory creation normalizes data and uses server tenant context", async () => {
  const calls = [];
  const service = createLaboratoryService({
    repository: {
      async create(input) {
        calls.push(input);
        return { id: "12", ...input.laboratory };
      },
    },
  });

  const laboratory = await service.create(
    {
      name: " Laboratori i Automatizimit ",
      code: "auto-01",
      faculty: "Fakulteti Teknik",
      building: "Objekti B",
      floor: "2",
      capacity: "24",
      responsibleUserId: "",
      description: "Laborator testues",
    },
    {
      universityId: "7",
      userId: "9",
      roles: ["university_admin"],
      ipAddress: "127.0.0.1",
    },
  );

  assert.equal(laboratory.code, "AUTO-01");
  assert.equal(laboratory.capacity, 24);
  assert.equal(calls[0].universityId, "7");
  assert.equal(calls[0].userId, "9");
  assert.equal(calls[0].laboratory.responsibleUserId, null);
  assert.equal("universityId" in calls[0].laboratory, false);
});

test("laboratory creation rejects invalid responsible users and duplicate codes", async () => {
  const invalidResponsibleService = createLaboratoryService({
    repository: {
      async create() {
        return { invalidResponsibleUser: true };
      },
    },
  });
  const input = {
    name: "Laboratori Test",
    code: "LAB-01",
    faculty: "Fakulteti Test",
    building: "A",
    floor: "1",
    capacity: 20,
  };

  await assert.rejects(
    invalidResponsibleService.create(input, {
      universityId: "7",
      userId: "9",
      roles: ["university_admin"],
    }),
    (error) => error.status === 422,
  );

  const duplicateService = createLaboratoryService({
    repository: {
      async create() {
        const error = new Error("duplicate");
        error.code = "ER_DUP_ENTRY";
        throw error;
      },
    },
  });
  await assert.rejects(
    duplicateService.create(input, {
      universityId: "7",
      userId: "9",
      roles: ["university_admin"],
    }),
    (error) => error.status === 409 && error.code === "LABORATORY_CODE_EXISTS",
  );
});

test("laboratory creation and tenant audit are atomic", async () => {
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
      if (sql.includes("INSERT INTO laboratories")) {
        return [{ insertId: 15 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createLaboratoryRepository({
    async getConnection() {
      return connection;
    },
  });

  const result = await repository.create({
    universityId: "7",
    userId: "9",
    ipAddress: "127.0.0.1",
    laboratory: {
      name: "Laboratori Test",
      code: "LAB-01",
      faculty: "Fakulteti Test",
      building: "A",
      floor: "1",
      capacity: 20,
      responsibleUserId: null,
      description: "",
      status: "active",
    },
  });

  assert.equal(result.id, "15");
  assert.deepEqual(events, ["begin", "commit", "release"]);
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO activity_logs")));
  assert.equal(calls[0].parameters[0], "7");
});

let server;
let baseUrl;
let capturedCreateContext;

before(async () => {
  const authenticateTenant = (request, _response, next) => {
    request.auth = {
      accountType: "university",
      universityId: "7",
      userId: "9",
      roles: ["university_admin"],
      permissions:
        request.headers["x-test-create"] === "true"
          ? ["laboratories.view", "laboratories.create"]
          : ["laboratories.view"],
    };
    next();
  };
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication: authenticateTenant,
      laboratoryService: {
        async list(_filters, context) {
          return {
            items: [{ id: "4", universityId: context.universityId }],
            pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
          };
        },
        async create(input, context) {
          capturedCreateContext = context;
          return { id: "5", name: input.name };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("laboratory routes derive tenant context and enforce create permission", async () => {
  const listResponse = await fetch(`${baseUrl}/api/laboratories`);
  const listPayload = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.data.laboratories[0].universityId, "7");

  const createResponse = await fetch(`${baseUrl}/api/laboratories`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      universityId: "999",
      name: "Laboratori i Palejuar",
    }),
  });
  assert.equal(createResponse.status, 403);

  const allowedResponse = await fetch(`${baseUrl}/api/laboratories`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-create": "true",
    },
    body: JSON.stringify({
      universityId: "999",
      name: "Laboratori i Ri",
    }),
  });
  const allowedPayload = await allowedResponse.json();
  assert.equal(allowedResponse.status, 201);
  assert.equal(allowedPayload.data.laboratory.id, "5");
  assert.equal(capturedCreateContext.universityId, "7");
  assert.equal(capturedCreateContext.userId, "9");
});
