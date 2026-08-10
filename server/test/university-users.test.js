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
});
