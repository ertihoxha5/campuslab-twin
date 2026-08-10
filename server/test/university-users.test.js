import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { createUniversityUserRepository } from "../src/modules/university-users/repository.js";
import { createUniversityUserService } from "../src/modules/university-users/service.js";

test("university user list applies tenant, status, search, and pagination", async () => {
  const calls = [];
  const repository = createUniversityUserRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
      return [
        [
          {
            id: 9,
            universityId: 7,
            fullName: "Ada Test",
            roleCodes: "lab_manager,technician",
            laboratoryAssignments: "15::Laboratori A",
          },
        ],
      ];
    },
  });
  const result = await repository.list({
    universityId: "7",
    page: 2,
    pageSize: 10,
    status: "active",
    search: "Ada",
  });
  assert.equal(result.total, 1);
  assert.ok(calls.every(({ sql }) => sql.includes("user.university_id = ?")));
  assert.ok(calls.every(({ parameters }) => parameters[0] === "7"));
  assert.ok(calls.every(({ parameters }) => parameters.includes("active")));
  assert.ok(calls.every(({ parameters }) => parameters.includes("%Ada%")));
});

test("university user service maps assignments and excludes platform roles", async () => {
  const service = createUniversityUserService({
    repository: {
      async list() {
        return {
          users: [
            {
              id: 9,
              universityId: 7,
              roleCodes: "technician",
              laboratoryAssignments: "15::Laboratori A||16::Laboratori B",
            },
          ],
          total: 1,
        };
      },
      async options(universityId) {
        assert.equal(universityId, "7");
        return {
          roles: [
            { id: 1, code: "platform_admin", name: "Platformë" },
            { id: 2, code: "technician", name: "Teknik" },
          ],
          laboratories: [{ id: 15, name: "Laboratori A" }],
        };
      },
    },
  });
  const result = await service.list({}, { universityId: "7" });
  assert.deepEqual(result.users[0].roles, ["technician"]);
  assert.equal(result.users[0].laboratories[1].id, "16");
  const options = await service.options({ universityId: "7" });
  assert.deepEqual(
    options.roles.map((role) => role.code),
    ["technician"],
  );
  assert.equal(options.laboratories[0].id, "15");
});

test("user detail and recent activity are scoped by tenant and target user", async () => {
  const calls = [];
  const repository = createUniversityUserRepository({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("FROM activity_logs")) {
        return [[{ id: 31, action: "auth.login", metadata: "{}" }]];
      }
      return [
        [
          {
            id: 12,
            universityId: 7,
            fullName: "Ada Test",
            roleCodes: "technician",
            laboratoryAssignments: "15::Laboratori A",
          },
        ],
      ];
    },
  });
  const result = await repository.detail({ universityId: "7", userId: "12" });
  assert.equal(result.activity.length, 1);
  assert.ok(
    calls.every(
      ({ sql }) =>
        sql.includes("university_id = ?") ||
        sql.includes("user.university_id = ?"),
    ),
  );
  assert.ok(calls.every(({ parameters }) => parameters.includes("7")));
  assert.ok(calls.every(({ parameters }) => parameters.includes("12")));
});

test("user detail normalizes profile, assignments, and activity metadata", async () => {
  const service = createUniversityUserService({
    repository: {
      async detail({ universityId, userId }) {
        assert.equal(universityId, "7");
        assert.equal(userId, "12");
        return {
          user: {
            id: 12,
            universityId: 7,
            roleCodes: "technician",
            laboratoryAssignments: "15::Laboratori A",
          },
          activity: [
            { id: 31, action: "auth.login", metadata: '{"source":"web"}' },
          ],
        };
      },
    },
  });
  const result = await service.detail("12", { universityId: "7" });
  assert.equal(result.user.laboratories[0].name, "Laboratori A");
  assert.equal(result.activity[0].id, "31");
  assert.equal(result.activity[0].metadata.source, "web");
});

test("user creation hashes passwords and derives tenant identity from context", async () => {
  let captured;
  const service = createUniversityUserService({
    passwordRounds: 4,
    repository: {
      async create(input) {
        captured = input;
        return { user: { id: "12", email: input.email, roles: input.roles } };
      },
    },
  });
  const user = await service.create(
    {
      fullName: "Ada Testuese",
      email: "ADA@EXAMPLE.EDU",
      phone: "+38344111222",
      jobTitle: "Teknike",
      status: "active",
      password: "Fjalekalim!2026",
      roles: ["technician"],
      laboratoryIds: ["15"],
      universityId: "999",
    },
    { universityId: "7", userId: "9", ipAddress: "127.0.0.1" },
  );
  assert.equal(user.id, "12");
  assert.equal(captured.universityId, "7");
  assert.equal(captured.actorUserId, "9");
  assert.equal(captured.email, "ada@example.edu");
  assert.notEqual(captured.passwordHash, "Fjalekalim!2026");
  assert.equal(captured.password, undefined);
});

test("user creation rejects platform role escalation before persistence", async () => {
  let persisted = false;
  const service = createUniversityUserService({
    repository: {
      async create() {
        persisted = true;
      },
    },
  });
  await assert.rejects(
    service.create(
      {
        fullName: "Sulmues Test",
        email: "sulmues@example.edu",
        status: "active",
        password: "Fjalekalim!2026",
        roles: ["platform_admin"],
        laboratoryIds: [],
      },
      { universityId: "7", userId: "9" },
    ),
    (error) => error.status === 422,
  );
  assert.equal(persisted, false);
});

test("user updates reject role escalation and keep server tenant context", async () => {
  let captured;
  const service = createUniversityUserService({
    repository: {
      async update(input) {
        captured = input;
        return { user: { id: input.userId, roles: input.roles } };
      },
    },
  });
  const valid = {
    fullName: "Ada Testuese",
    email: "ada@example.edu",
    roles: ["lab_manager"],
    laboratoryIds: ["15"],
  };
  const user = await service.update(
    "12",
    { ...valid, universityId: "999" },
    { universityId: "7", userId: "9" },
  );
  assert.equal(user.id, "12");
  assert.equal(captured.universityId, "7");
  await assert.rejects(
    service.update(
      "12",
      { ...valid, roles: ["platform_admin"] },
      { universityId: "7", userId: "9" },
    ),
    (error) => error.status === 422,
  );
});

test("status changes prevent self-deactivation", async () => {
  let calls = 0;
  const service = createUniversityUserService({
    repository: {
      async setStatus(input) {
        calls += 1;
        return { id: input.userId, status: input.status };
      },
    },
  });
  await assert.rejects(
    service.setStatus(
      "9",
      { status: "inactive" },
      { universityId: "7", userId: "9" },
    ),
    (error) => error.status === 422,
  );
  assert.equal(calls, 0);
  const user = await service.setStatus(
    "12",
    { status: "inactive" },
    { universityId: "7", userId: "9" },
  );
  assert.equal(user.status, "inactive");
});

test("deactivation revokes tenant user sessions and writes audit atomically", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("SELECT id, status FROM users"))
        return [[{ id: 12, status: "active" }]];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createUniversityUserRepository({
    async getConnection() {
      return connection;
    },
  });
  const result = await repository.setStatus({
    userId: "12",
    universityId: "7",
    actorUserId: "9",
    status: "inactive",
    ipAddress: null,
  });
  assert.equal(result.status, "inactive");
  const revocation = calls.find(({ sql }) =>
    sql.includes("UPDATE refresh_tokens"),
  );
  assert.deepEqual(revocation.parameters, ["12", "7"]);
  assert.ok(
    calls.some(({ parameters }) =>
      parameters.includes("university.user.deactivated"),
    ),
  );
});

test("user repository creates user, roles, assignments, and audit atomically", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() {
      calls.push({ sql: "BEGIN", parameters: [] });
    },
    async commit() {
      calls.push({ sql: "COMMIT", parameters: [] });
    },
    async rollback() {},
    release() {},
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql.includes("SELECT id, code FROM roles"))
        return [[{ id: 3, code: "technician" }]];
      if (sql.includes("SELECT id FROM laboratories")) return [[{ id: 15 }]];
      if (sql.includes("INSERT INTO users")) return [{ insertId: 12 }];
      return [{ affectedRows: 1 }];
    },
  };
  const repository = createUniversityUserRepository({
    async getConnection() {
      return connection;
    },
  });
  const result = await repository.create({
    universityId: "7",
    actorUserId: "9",
    fullName: "Ada Test",
    email: "ada@example.edu",
    passwordHash: "hash",
    phone: null,
    jobTitle: "Teknike",
    status: "active",
    roles: ["technician"],
    laboratoryIds: ["15"],
    ipAddress: "127.0.0.1",
  });
  assert.equal(result.user.id, "12");
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO user_roles")));
  assert.ok(
    calls.some(({ sql }) =>
      sql.includes("INSERT INTO user_laboratory_assignments"),
    ),
  );
  assert.ok(calls.some(({ sql }) => sql.includes("'university.user.created'")));
  assert.ok(calls.some(({ sql }) => sql === "COMMIT"));
});

let server;
let baseUrl;
let captured;
before(async () => {
  server = createServer(
    createApp({
      logging: false,
      rateLimitEnabled: false,
      tenantAuthentication(request, _response, next) {
        request.auth = {
          universityId: "7",
          userId: "9",
          roles: ["university_admin"],
          permissions: request.headers["x-test-users"]
            ? ["university.users.manage"]
            : [],
        };
        next();
      },
      universityUserService: {
        async list(input, context) {
          captured = { input, context };
          return { users: [], pagination: { page: 1, pageSize: 20, total: 0 } };
        },
        async options() {
          return { roles: [], laboratories: [] };
        },
        async detail(_id, context) {
          captured = { context };
          return { user: { id: "12" }, activity: [] };
        },
        async create(_input, context) {
          captured = { context };
          return { id: "12" };
        },
        async update(_id, _input, context) {
          captured = { context };
          return { id: "12" };
        },
        async setStatus(_id, input, context) {
          captured = { context };
          return { id: "12", status: input.status };
        },
      },
    }),
  );
  server.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test("university user endpoints require management permission and server tenant", async () => {
  assert.equal((await fetch(`${baseUrl}/api/university/users`)).status, 403);
  const response = await fetch(
    `${baseUrl}/api/university/users?status=active`,
    { headers: { "x-test-users": "true" } },
  );
  assert.equal(response.status, 200);
  assert.equal(captured.context.universityId, "7");
  assert.equal(captured.input.status, "active");
  assert.equal(
    (
      await fetch(`${baseUrl}/api/university/users/options`, {
        headers: { "x-test-users": "true" },
      })
    ).status,
    200,
  );
  const detail = await fetch(`${baseUrl}/api/university/users/12`, {
    headers: { "x-test-users": "true" },
  });
  assert.equal(detail.status, 200);
  assert.equal(captured.context.universityId, "7");
  const created = await fetch(`${baseUrl}/api/university/users`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-users": "true" },
    body: "{}",
  });
  assert.equal(created.status, 201);
  assert.equal(captured.context.universityId, "7");
  const updated = await fetch(`${baseUrl}/api/university/users/12`, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-test-users": "true" },
    body: "{}",
  });
  assert.equal(updated.status, 200);
  const deactivated = await fetch(`${baseUrl}/api/university/users/12/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-test-users": "true" },
    body: JSON.stringify({ status: "inactive" }),
  });
  assert.equal(deactivated.status, 200);
});
